
import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Info, Calculator, Calendar, Truck, Camera, Sparkles, Loader2, CheckCircle2, Image as ImageIcon, RefreshCcw, Eye, Trash2, AlertCircle } from 'lucide-react';
import { Trip, FreightRate, UserSession } from '../types';
import { generateId } from '../db';
import { GoogleGenAI } from "@google/genai";

interface NewTripFormProps {
  db: any;
  user: UserSession;
  initialData?: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

const NewTripForm: React.FC<NewTripFormProps> = ({ db, user, initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    invoiceNumber: initialData?.invoiceNumber || '',
    customerId: initialData?.customerId || '',
    driverId: initialData?.driverId || (user.role === 'driver' ? user.driverId : ''),
    vehicleId: initialData?.vehicleId || '',
    originId: initialData?.originId || '',
    destinationId: initialData?.destinationId || '',
    materialId: initialData?.materialId || '',
    qtyTons: initialData?.qtyTons || 0,
    pricePerTon: initialData?.pricePerTon || 0,
    totalValue: initialData?.totalValue || 0,
    invoiceImageUrl: initialData?.invoiceImageUrl || ''
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (formData.originId && formData.destinationId) {
      const rate = db.freightRates.find(
        (r: FreightRate) => r.originId === formData.originId && r.destinationId === formData.destinationId
      );
      if (rate) {
        setFormData(prev => ({
          ...prev,
          pricePerTon: rate.pricePerTon,
          totalValue: Number((prev.qtyTons * rate.pricePerTon).toFixed(2))
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          totalValue: Number((prev.qtyTons * prev.pricePerTon).toFixed(2))
        }));
      }
    } else if (formData.qtyTons || formData.pricePerTon) {
        setFormData(prev => ({
          ...prev,
          totalValue: Number((prev.qtyTons * prev.pricePerTon).toFixed(2))
        }));
    }
  }, [formData.originId, formData.destinationId, formData.qtyTons, formData.pricePerTon, db.freightRates]);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.error("Erro ao dar play no vídeo:", err));
    }
  }, [isCameraActive]);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
      
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setIsCompressing(true);
        const compressedDataUrl = await compressImage(rawDataUrl);
        setIsCompressing(false);
        const base64 = compressedDataUrl.split(',')[1];
        processImageBase64(base64, 'image/jpeg', compressedDataUrl);
        stopCamera();
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setIsCompressing(true);
      const compressed = await compressImage(reader.result as string);
      setIsCompressing(false);
      processImageBase64(compressed.split(',')[1], 'image/jpeg', compressed);
    };
  };

  const handleManualReauth = async () => {
    if (window.aistudio) {
      await (window.aistudio as any).openSelectKey();
      setNeedsKeySelection(false);
    }
  };

  const processImageBase64 = async (base64Data: string, mimeType: string, fullUrl: string) => {
    setIsScanning(true);
    setFormData(prev => ({ ...prev, invoiceImageUrl: fullUrl }));

    try {
      // Verifica se a chave de API está selecionada (específico para deploy)
      if (window.aistudio) {
        const hasKey = await (window.aistudio as any).hasSelectedApiKey();
        if (!hasKey) {
          await (window.aistudio as any).openSelectKey();
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: "Você é um especialista em logística. Extraia da imagem desta Nota Fiscal (DANFE) apenas: data_emissao (formato YYYY-MM-DD), numero_nota (apenas dígitos), peso_liquido_toneladas (número decimal). Retorne exclusivamente um JSON puro." }
          ]
        },
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const text = response.text;
      if (!text) throw new Error("Resposta vazia da IA");
      
      const result = JSON.parse(text);
      setExtractedData(result);
      setShowConfirmModal(true);
    } catch (error: any) {
      console.error("Erro na extração IA:", error);
      
      // Se o erro for de entidade não encontrada ou permissão, sinaliza necessidade de chave
      if (error.message?.includes("Requested entity was not found") || error.message?.includes("404") || error.message?.includes("403")) {
        setNeedsKeySelection(true);
      }
      
      alert("A IA encontrou uma instabilidade ao ler a nota. Verifique se a chave de API está ativa no menu de configurações ou preencha os dados manualmente.");
    } finally {
      setIsScanning(false);
    }
  };

  const confirmExtractedData = () => {
    if (extractedData) {
      setFormData(prev => ({
        ...prev,
        invoiceNumber: extractedData.numero_nota || prev.invoiceNumber,
        date: extractedData.data_emissao || prev.date,
        qtyTons: extractedData.peso_liquido_toneladas ? Number(extractedData.peso_liquido_toneladas) : prev.qtyTons,
      }));
    }
    setShowConfirmModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.customerId || !formData.driverId || !formData.vehicleId || formData.qtyTons <= 0) {
      alert("Por favor, preencha todos os campos obrigatórios e anexe a NF.");
      return;
    }
    onSave({
      ...formData,
      id: initialData?.id || generateId(),
      createdAt: initialData?.createdAt || Date.now()
    });
  };

  const inputClass = (isSelect: boolean = false) => `
    w-full px-4 py-4 rounded-xl border outline-none transition-all
    bg-slate-900 text-white placeholder-slate-400 font-bold text-base shadow-inner
    ${isSelect ? 'dark-select' : ''} border-slate-700 focus:ring-4 focus:ring-red-500/20 focus:border-red-500
  `;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        <div className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
          {!initialData && (
            <div className="flex space-x-2">
              {needsKeySelection && (
                <button type="button" onClick={handleManualReauth} className="flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest animate-bounce">
                  <AlertCircle size={16} />
                  <span>Configurar IA</span>
                </button>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-all active:scale-95">
                <ImageIcon size={20} />
                <span className="hidden sm:inline">Galeria</span>
              </button>
              <button type="button" onClick={startCamera} className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95">
                {isScanning || isCompressing ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                <span>{isScanning ? 'Lendo NF...' : (isCompressing ? 'Processando...' : 'Câmera')}</span>
              </button>
            </div>
          )}
          <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 ml-2"><X size={28} /></button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-50 pb-3">
              <Info size={18} className="text-red-500" />
              <span>Dados da Operação</span>
            </h3>

            {formData.invoiceImageUrl && (
              <div className="relative group">
                <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative">
                  <img src={formData.invoiceImageUrl} alt="Nota Fiscal" className="w-full h-full object-contain bg-slate-100" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                    <button type="button" onClick={() => setShowFullImage(true)} className="p-3 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"><Eye size={24} /></button>
                    {!initialData && <button type="button" onClick={() => setFormData(p => ({ ...p, invoiceImageUrl: '' }))} className="p-3 bg-white rounded-full text-red-600 hover:scale-110 transition-transform"><Trash2 size={24} /></button>}
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg"><CheckCircle2 size={16} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest text-center">Imagem Processada ✓</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Data</label><input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className={inputClass()} /></div>
              <div className="space-y-1.5"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Nota Fiscal</label><input type="text" placeholder="000.000" value={formData.invoiceNumber} onChange={e => setFormData(p => ({ ...p, invoiceNumber: e.target.value }))} className={inputClass()} /></div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Cliente</label>
              <select value={formData.customerId} onChange={e => setFormData(p => ({ ...p, customerId: e.target.value }))} className={inputClass(true)}>
                <option value="" className="bg-slate-900">Selecionar Cliente</option>
                {db.customers.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Motorista</label>
              <select value={formData.driverId} onChange={e => isAdmin && setFormData(p => ({ ...p, driverId: e.target.value }))} disabled={!isAdmin} className={inputClass(true) + (!isAdmin ? " opacity-50" : "")}>
                <option value="" className="bg-slate-900">Selecionar</option>
                {db.drivers.map((d: any) => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Veículo</label>
              <select value={formData.vehicleId} onChange={e => setFormData(p => ({ ...p, vehicleId: e.target.value }))} className={inputClass(true)}>
                <option value="" className="bg-slate-900">Selecionar Placa</option>
                {db.vehicles.map((v: any) => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-50 pb-3"><Truck size={18} className="text-red-500" /><span>Logística</span></h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Origem</label><select value={formData.originId} onChange={e => setFormData(p => ({ ...p, originId: e.target.value }))} className={inputClass(true)}>
                  <option value="" className="bg-slate-900">Local Carga</option>
                  {db.locations.map((l: any) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Destino</label><select value={formData.destinationId} onChange={e => setFormData(p => ({ ...p, destinationId: e.target.value }))} className={inputClass(true)}>
                  <option value="" className="bg-slate-900">Local Descarga</option>
                  {db.locations.map((l: any) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Material</label>
              <select value={formData.materialId} onChange={e => setFormData(p => ({ ...p, materialId: e.target.value }))} className={inputClass(true)}>
                <option value="" className="bg-slate-900">Tipo Carga</option>
                {db.materials.map((m: any) => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-red-600 p-8 rounded-3xl shadow-2xl text-white space-y-6">
            <h3 className="font-black flex items-center space-x-2 border-b border-white/20 pb-3 uppercase tracking-tighter text-sm"><Calculator size={16} /><span>Faturamento</span></h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-red-100">Quantidade (t)</label>
                    <input type="number" step="0.01" value={formData.qtyTons || ''} onChange={e => setFormData(p => ({ ...p, qtyTons: Number(e.target.value) }))} className="w-full bg-slate-900 text-white border border-red-400/30 rounded-2xl px-4 py-4 outline-none font-black text-2xl text-center" placeholder="0.00" />
                </div>
                {isAdmin && (
                   <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-red-100">Valor/Ton (R$)</label>
                    <input type="number" step="0.01" value={formData.pricePerTon || ''} onChange={e => setFormData(p => ({ ...p, pricePerTon: Number(e.target.value) }))} className="w-full bg-slate-900 text-white border border-red-400/30 rounded-2xl px-4 py-4 outline-none font-black text-2xl text-center" placeholder="0.00" />
                   </div>
                )}
            </div>
            <div className="bg-black/20 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-200 mb-2">Total Estimado</p>
              <p className="text-4xl font-black tracking-tighter">{isAdmin || true ? `R$ ${formData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '***'}</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center justify-end space-x-4 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="px-8 py-4 rounded-xl font-black text-slate-500 hover:text-red-600 uppercase text-xs tracking-widest">Descartar</button>
          <button type="submit" disabled={isCompressing || isScanning} className="flex items-center justify-center space-x-3 bg-red-600 text-white px-14 py-5 rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95 text-xl uppercase tracking-tighter disabled:opacity-50">
            {isCompressing ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            <span>Confirmar Lançamento</span>
          </button>
        </div>
      </form>

      {showFullImage && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => setShowFullImage(false)} className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={40} /></button>
          <img src={formData.invoiceImageUrl} alt="Nota Fiscal Full" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-4xl flex flex-col items-center justify-center p-4">
            <button type="button" onClick={stopCamera} className="absolute top-6 right-6 z-20 bg-white/10 p-3 rounded-full text-white"><X size={32} /></button>
            <div className="relative w-full aspect-[3/4] max-h-[70vh] rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="mt-12 flex items-center space-x-8">
              <button type="button" onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-red-600 active:scale-90 transition-transform shadow-2xl"><div className="w-14 h-14 rounded-full border-2 border-white/50"></div></button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
              <div className="bg-red-100 p-4 rounded-3xl text-red-600"><Sparkles size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900">IA: Leitura Concluída</h3>
              <p className="text-slate-500 font-medium">Confirme se os dados lidos estão corretos.</p>
            </div>
            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl mb-8">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200"><span className="text-xs font-black uppercase text-slate-400">Nota</span><input type="text" className="font-bold text-right bg-transparent outline-none" value={extractedData?.numero_nota || ''} onChange={e => setExtractedData({...extractedData, numero_nota: e.target.value})} /></div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200"><span className="text-xs font-black uppercase text-slate-400">Data</span><input type="date" className="font-bold text-right bg-transparent outline-none" value={extractedData?.data_emissao || ''} onChange={e => setExtractedData({...extractedData, data_emissao: e.target.value})} /></div>
              <div className="flex justify-between items-center"><span className="text-xs font-black uppercase text-slate-400">Peso (t)</span><input type="number" step="0.001" className="font-bold text-right bg-transparent outline-none" value={extractedData?.peso_liquido_toneladas || ''} onChange={e => setExtractedData({...extractedData, peso_liquido_toneladas: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="py-4 rounded-2xl font-black text-slate-400 uppercase text-xs tracking-widest">Ignorar</button>
              <button type="button" onClick={confirmExtractedData} className="bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center space-x-2"><CheckCircle2 size={18} /><span>Confirmar</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTripForm;
