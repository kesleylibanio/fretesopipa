
import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Info, Truck, Calculator, Loader2, CheckCircle2 } from 'lucide-react';
import { Trip, FreightRate, UserSession } from '../types';
import { generateId } from '../db';
import { SearchableSelect } from './SearchableSelect';

interface BatchTripFormProps {
  db: any;
  user: UserSession;
  draftFixed: any;
  setDraftFixed: (data: any) => void;
  draftItems: any[];
  setDraftItems: (items: any[]) => void;
  onSave: (trips: Trip[]) => void;
  onCancel: () => void;
}

interface BatchItem {
  id: string;
  date: string;
  invoiceNumber: string;
  qtyTons: number;
}

const BatchTripForm: React.FC<BatchTripFormProps> = ({ 
  db, user, draftFixed, setDraftFixed, draftItems, setDraftItems, onSave, onCancel 
}) => {
  const [fixedData, setFixedData] = useState(draftFixed);
  const [items, setItems] = useState<BatchItem[]>(draftItems);

  useEffect(() => {
    setDraftFixed(fixedData);
  }, [fixedData, setDraftFixed]);

  useEffect(() => {
    setDraftItems(items);
  }, [items, setDraftItems]);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (fixedData.originId && fixedData.destinationId) {
      const rate = db.freightRates.find(
        (r: FreightRate) => r.originId === fixedData.originId && r.destinationId === fixedData.destinationId
      );
      if (rate) {
        setFixedData(prev => ({ ...prev, pricePerTon: rate.pricePerTon }));
      }
    }
  }, [fixedData.originId, fixedData.destinationId, db.freightRates]);

  const addItem = () => {
    const lastDate = items.length > 0 ? items[items.length - 1].date : new Date().toISOString().split('T')[0];
    setItems([...items, { id: Math.random().toString(), date: lastDate, invoiceNumber: '', qtyTons: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BatchItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fixedData.customerId || !fixedData.driverId || !fixedData.vehicleId || !fixedData.originId || !fixedData.destinationId || !fixedData.materialId) {
      alert("Por favor, preencha todos os campos fixos obrigatórios.");
      return;
    }

    const validItems = items.filter(item => item.invoiceNumber && item.qtyTons > 0 && item.date);
    
    if (validItems.length === 0) {
      alert("Por favor, adicione pelo menos um lançamento válido (Data, NF e Quantidade).");
      return;
    }

    const trips: Trip[] = validItems.map(item => ({
      id: generateId(),
      date: item.date,
      invoiceNumber: item.invoiceNumber,
      customerId: fixedData.customerId,
      driverId: fixedData.driverId,
      vehicleId: fixedData.vehicleId,
      originId: fixedData.originId,
      destinationId: fixedData.destinationId,
      materialId: fixedData.materialId,
      qtyTons: item.qtyTons,
      pricePerTon: fixedData.pricePerTon,
      totalValue: Number((item.qtyTons * fixedData.pricePerTon).toFixed(2)),
      createdAt: Date.now()
    }));

    onSave(trips);
  };

  const inputClass = (isSelect: boolean = false) => `
    w-full px-4 py-3 rounded-xl border outline-none transition-all
    bg-white text-slate-900 placeholder-slate-400 font-bold text-sm shadow-sm
    ${isSelect ? 'dark-select' : ''} border-slate-200 focus:ring-4 focus:ring-red-500/20 focus:border-red-500
  `;

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qtyTons) || 0), 0);
  const totalValue = totalQty * fixedData.pricePerTon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lançamento em Lote</h2>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600"><X size={28} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos Fixos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-50 pb-3">
              <Info size={18} className="text-red-500" />
              <span>Dados Fixos da Operação</span>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                <SearchableSelect
                  value={fixedData.customerId}
                  onChange={val => setFixedData(p => ({ ...p, customerId: val }))}
                  options={db.customers.map((c: any) => ({ id: c.id, label: c.name }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Motorista</label>
                <SearchableSelect
                  value={fixedData.driverId}
                  onChange={val => setFixedData(p => ({ ...p, driverId: val }))}
                  options={db.drivers.map((d: any) => ({ id: d.id, label: d.name }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</label>
                <SearchableSelect
                  value={fixedData.vehicleId}
                  onChange={val => setFixedData(p => ({ ...p, vehicleId: val }))}
                  options={db.vehicles.map((v: any) => ({ id: v.id, label: v.plate }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</label>
                <SearchableSelect
                  value={fixedData.originId}
                  onChange={val => setFixedData(p => ({ ...p, originId: val }))}
                  options={db.locations.map((l: any) => ({ id: l.id, label: l.name }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino</label>
                <SearchableSelect
                  value={fixedData.destinationId}
                  onChange={val => setFixedData(p => ({ ...p, destinationId: val }))}
                  options={db.locations.map((l: any) => ({ id: l.id, label: l.name }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</label>
                <SearchableSelect
                  value={fixedData.materialId}
                  onChange={val => setFixedData(p => ({ ...p, materialId: val }))}
                  options={db.materials.map((m: any) => ({ id: m.id, label: m.name }))}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-1.5 w-full max-w-[200px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor/Ton (R$)</label>
                <input type="number" step="0.01" value={fixedData.pricePerTon || ''} onChange={e => setFixedData(p => ({ ...p, pricePerTon: Number(e.target.value) }))} className={inputClass()} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="bg-red-600 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-center space-y-4">
            <h3 className="font-black flex items-center space-x-2 border-b border-white/20 pb-2 uppercase tracking-tighter text-xs">
              <Calculator size={14} />
              <span>Resumo do Lote</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Total Peso</p>
                <p className="text-2xl font-black">{totalQty.toFixed(2)} t</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Total Valor</p>
                <p className="text-2xl font-black">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Itens Variáveis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Plus size={18} className="text-red-500" />
              <span>Itens do Lote (Data, NF e Peso)</span>
            </h3>
            <button type="button" onClick={addItem} className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
              <Plus size={14} />
              <span>Adicionar Linha</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-end space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex-none w-8 h-10 flex items-center justify-center text-slate-300 font-black text-xs">
                  {index + 1}
                </div>
                <div className="flex-[1.5] space-y-1">
                  {index === 0 && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>}
                  <input 
                    type="date" 
                    value={item.date} 
                    onChange={e => updateItem(item.id, 'date', e.target.value)} 
                    className={inputClass()} 
                  />
                </div>
                <div className="flex-1 space-y-1">
                  {index === 0 && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota Fiscal</label>}
                  <input 
                    type="text" 
                    placeholder="NF" 
                    value={item.invoiceNumber} 
                    onChange={e => updateItem(item.id, 'invoiceNumber', e.target.value)} 
                    className={inputClass()} 
                  />
                </div>
                <div className="flex-1 space-y-1 w-full max-w-[200px]">
                  {index === 0 && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade (t)</label>}
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={item.qtyTons || ''} 
                    onChange={e => updateItem(item.id, 'qtyTons', Number(e.target.value))} 
                    className={inputClass()} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeItem(item.id)} 
                  className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                  disabled={items.length === 1}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-slate-500 hover:text-red-600 uppercase text-xs tracking-widest">Cancelar</button>
          <button type="submit" className="w-full max-w-[420px] flex items-center justify-center space-x-3 bg-red-600 text-white px-14 py-5 rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95 text-xl uppercase tracking-tighter">
            <Save size={24} />
            <span>Salvar {items.length} Lançamentos</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BatchTripForm;
