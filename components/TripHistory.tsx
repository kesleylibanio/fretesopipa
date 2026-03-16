
import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, Download, Calendar, Truck, User, MapPin, History, ImageIcon, X, Eye, Image as ImageIconLucide } from 'lucide-react';
import { Trip, UserSession } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface TripHistoryProps {
  db: any;
  user: UserSession;
  initialSearch: string;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
}

const TripHistory: React.FC<TripHistoryProps> = ({ db, user, initialSearch, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filter, setFilter] = useState({
    date: '',
    customerId: '',
    driverId: '',
    vehicleId: '',
    materialId: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isAdmin = user.role === 'admin';

  const filteredTrips = useMemo(() => {
    const trips = db?.trips || [];
    const customers = db?.customers || [];
    const drivers = db?.drivers || [];
    const vehicles = db?.vehicles || [];
    const locations = db?.locations || [];

    return trips.filter((trip: Trip) => {
      // Regra de Privacidade Crítica: Motorista só vê suas próprias viagens.
      if (!isAdmin) {
        const tripDriver = String(trip.driverId || '').trim().toLowerCase();
        const sessionDriverId = String(user.driverId || '').trim().toLowerCase();
        const sessionUsername = String(user.username || '').trim().toLowerCase();
        
        // Compara com o ID do motorista (nome salvo no banco) ou username da sessão
        if (tripDriver !== sessionDriverId && tripDriver !== sessionUsername) return false;
      }

      const customer = customers.find((c: any) => c.id === trip.customerId)?.name || trip.customerId || '';
      const driver = drivers.find((d: any) => d.id === trip.driverId)?.name || trip.driverId || '';
      const vehicle = vehicles.find((v: any) => v.id === trip.vehicleId)?.plate || trip.vehicleId || '';
      const origin = locations.find((l: any) => l.id === trip.originId)?.name || trip.originId || '';
      const dest = locations.find((l: any) => l.id === trip.destinationId)?.name || trip.destinationId || '';

      const matchesSearch = [
        trip.invoiceNumber || '',
        customer,
        driver,
        vehicle,
        origin,
        dest
      ].some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilters = 
        (!filter.date || trip.date === filter.date) &&
        (!filter.customerId || trip.customerId === filter.customerId) &&
        (!filter.driverId || trip.driverId === filter.driverId) &&
        (!filter.vehicleId || trip.vehicleId === filter.vehicleId) &&
        (!filter.materialId || trip.materialId === filter.materialId);

      return matchesSearch && matchesFilters;
    });
  }, [db, searchTerm, filter, user, isAdmin]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Modal de Preview de Imagem */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white p-3 hover:bg-white/10 rounded-full transition-all">
            <X size={40} />
          </button>
          <img src={previewImage} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Histórico de Lançamentos</h2>
          <p className="text-slate-500 mt-1 font-bold text-sm md:text-base">
            {isAdmin ? "Visualizando todos os registros da frota." : "Visualizando seus lançamentos pessoais."}
          </p>
        </div>
        <button className="flex items-center justify-center space-x-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95">
          <Download size={20} />
          <span>Exportar Relatório</span>
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text" 
            placeholder="Pesquisar por NF, cliente, placa..."
            className="w-full pl-16 pr-6 py-5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-lg shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cliente</label>
            <SearchableSelect
              value={filter.customerId}
              onChange={val => setFilter(prev => ({ ...prev, customerId: val }))}
              options={(db?.customers || []).map((c: any) => ({ id: c.id, label: c.name }))}
              placeholder="Todos os Clientes"
            />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Motorista</label>
              <SearchableSelect
                value={filter.driverId}
                onChange={val => setFilter(prev => ({ ...prev, driverId: val }))}
                options={(db?.drivers || []).map((d: any) => ({ id: d.id, label: d.name }))}
                placeholder="Todos os Motoristas"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Veículo</label>
            <SearchableSelect
              value={filter.vehicleId}
              onChange={val => setFilter(prev => ({ ...prev, vehicleId: val }))}
              options={(db?.vehicles || []).map((v: any) => ({ id: v.id, label: v.plate }))}
              placeholder="Todos os Veículos"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Data</label>
            <input 
              type="date"
              value={filter.date}
              onChange={e => setFilter(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
            <History size={64} className="mx-auto text-slate-200 mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredTrips.map((trip: Trip) => {
                const customerName = (db?.customers || []).find((c: any) => c.id === trip.customerId)?.name || trip.customerId;
                const driverName = (db?.drivers || []).find((d: any) => d.id === trip.driverId)?.name || trip.driverId;
                const vehiclePlate = (db?.vehicles || []).find((v: any) => v.id === trip.vehicleId)?.plate || trip.vehicleId;
                const originName = (db?.locations || []).find((l: any) => l.id === trip.originId)?.name || trip.originId;
                const destName = (db?.locations || []).find((l: any) => l.id === trip.destinationId)?.name || trip.destinationId;

                return (
                  <div key={trip.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data / NF</span>
                        <p className="font-black text-slate-900 text-lg">{new Date(trip.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs text-slate-500 font-mono font-bold">NF {trip.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Peso</span>
                        <p className="font-black text-red-600 text-xl">{trip.qtyTons.toLocaleString('pt-BR')}t</p>
                      </div>
                    </div>

                    <div className="py-4 border-y border-slate-50 space-y-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cliente / Motorista</span>
                        <p className="font-black text-slate-800 tracking-tight">{customerName}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase">{driverName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rota / Placa</span>
                        <div className="flex items-center text-xs font-black text-slate-600 uppercase space-x-2">
                          <span>{originName}</span>
                          <span className="text-red-400">→</span>
                          <span>{destName}</span>
                        </div>
                        <p className="text-sm font-black text-slate-900 mt-1">{vehiclePlate}</p>
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faturamento</span>
                          <p className="font-black text-emerald-600 text-lg">R$ {trip.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex space-x-2">
                        {trip.invoiceImageUrl && (
                          <button 
                            onClick={() => setPreviewImage(trip.invoiceImageUrl!)}
                            className="p-3 bg-red-50 text-red-600 rounded-xl active:scale-90 transition-transform"
                          >
                            <ImageIconLucide size={20} />
                          </button>
                        )}
                        <button 
                          onClick={() => onEdit(trip)}
                          className="p-3 bg-slate-50 text-slate-600 rounded-xl active:scale-90 transition-transform"
                        >
                          <Edit2 size={20} />
                        </button>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => onDelete(trip.id)}
                          className="p-3 bg-red-50 text-red-600 rounded-xl active:scale-90 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
              <table className="w-full bg-white text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data / NF</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente / Motorista</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rota / Placa</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Peso</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Faturamento</th>
                    <th className="px-8 py-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTrips.map((trip: Trip) => {
                    const customerName = (db?.customers || []).find((c: any) => c.id === trip.customerId)?.name || trip.customerId;
                    const driverName = (db?.drivers || []).find((d: any) => d.id === trip.driverId)?.name || trip.driverId;
                    const vehiclePlate = (db?.vehicles || []).find((v: any) => v.id === trip.vehicleId)?.plate || trip.vehicleId;
                    const originName = (db?.locations || []).find((l: any) => l.id === trip.originId)?.name || trip.originId;
                    const destName = (db?.locations || []).find((l: any) => l.id === trip.destinationId)?.name || trip.destinationId;

                    return (
                      <tr key={trip.id} className="hover:bg-red-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base">{new Date(trip.date).toLocaleDateString('pt-BR')}</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-slate-400 font-mono font-bold">NF {trip.invoiceNumber}</span>
                              {trip.invoiceImageUrl && (
                                <button 
                                  onClick={() => setPreviewImage(trip.invoiceImageUrl!)} 
                                  className="bg-red-100 text-red-600 p-1 rounded-md hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                  title="Ver Comprovante"
                                >
                                  <ImageIcon size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 tracking-tight">{customerName}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{driverName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <div className="flex items-center text-[10px] font-black text-slate-500 uppercase space-x-2">
                              <span>{originName}</span>
                              <span className="text-red-300">→</span>
                              <span>{destName}</span>
                            </div>
                            <span className="text-sm font-black text-red-600 mt-1">{vehiclePlate}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="font-black text-slate-700 text-lg">{trip.qtyTons.toLocaleString('pt-BR')}t</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="font-black text-slate-900 text-lg">
                            {isAdmin ? `R$ ${trip.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '***'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {trip.invoiceImageUrl && (
                              <button 
                                onClick={() => setPreviewImage(trip.invoiceImageUrl!)}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-red-100"
                              >
                                <Eye size={20} />
                              </button>
                            )}
                            <button 
                              onClick={() => onEdit(trip)}
                              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-slate-200"
                            >
                              <Edit2 size={20} />
                            </button>
                            {isAdmin && (
                              <button 
                                onClick={() => onDelete(trip.id)}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-red-100"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TripHistory;
