
import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, Download, Calendar, Truck, User, MapPin, History, ImageIcon, X, Eye, Image as ImageIconLucide } from 'lucide-react';
import { Trip, UserSession } from '../types';

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
      // Motorista só vê suas próprias viagens. 
      // Suporte para comparação por ID (UUID) ou Nome Direto
      if (!isAdmin) {
        if (trip.driverId !== user.driverId && trip.driverId !== user.username) return false;
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Histórico de Lançamentos</h2>
          <p className="text-slate-500 text-sm font-medium">Confira os dados e comprovantes das viagens.</p>
        </div>
        <button className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl active:scale-95">
          <Download size={18} />
          <span>Exportar Relatório</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text" 
            placeholder="Pesquisar por NF, cliente, motorista..."
            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select 
            value={filter.customerId}
            onChange={e => setFilter(prev => ({ ...prev, customerId: e.target.value }))}
            className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Cliente</option>
            {(db?.customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isAdmin && (
            <select 
              value={filter.driverId}
              onChange={e => setFilter(prev => ({ ...prev, driverId: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Motorista</option>
              {(db?.drivers || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <select 
            value={filter.vehicleId}
            onChange={e => setFilter(prev => ({ ...prev, vehicleId: e.target.value }))}
            className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Veículo</option>
            {(db?.vehicles || []).map((v: any) => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
          <input 
            type="date"
            value={filter.date}
            onChange={e => setFilter(prev => ({ ...prev, date: e.target.value }))}
            className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-50">
            <History size={64} className="mx-auto text-slate-100 mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 shadow-xl">
            <table className="w-full bg-white text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Data / NF</th>
                  <th className="px-8 py-6">Cliente / Motorista</th>
                  <th className="px-8 py-6">Rota / Placa</th>
                  <th className="px-8 py-6 text-right">Peso</th>
                  <th className="px-8 py-6 text-right">Faturamento</th>
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
        )}
      </div>
    </div>
  );
};

export default TripHistory;
