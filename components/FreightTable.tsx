
import React, { useState } from 'react';
import { Search, Plus, Trash2, MapPin, Calculator, AlertCircle } from 'lucide-react';
import { FreightRate } from '../types';
import { generateId } from '../db';

interface FreightTableProps {
  db: any;
  setDb: (fn: (prev: any) => any) => void;
}

const FreightTable: React.FC<FreightTableProps> = ({ db, setDb }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newRate, setNewRate] = useState({
    originId: '',
    destinationId: '',
    pricePerTon: 0
  });
  const [error, setError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newRate.originId || !newRate.destinationId || newRate.pricePerTon <= 0) {
      setError('Preencha todos os campos corretamente.');
      return;
    }

    if (newRate.originId === newRate.destinationId) {
      setError('Origem e destino não podem ser iguais.');
      return;
    }

    const exists = db.freightRates.some(
      (fr: FreightRate) => fr.originId === newRate.originId && fr.destinationId === newRate.destinationId
    );

    if (exists) {
      setError('Esta rota já está cadastrada.');
      return;
    }

    setDb(prev => ({
      ...prev,
      freightRates: [...prev.freightRates, { id: generateId(), ...newRate }]
    }));

    setNewRate({ originId: '', destinationId: '', pricePerTon: 0 });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deseja excluir esta rota?')) return;
    setDb(prev => ({
      ...prev,
      freightRates: prev.freightRates.filter((fr: FreightRate) => fr.id !== id)
    }));
  };

  const filteredRates = db.freightRates.filter((rate: FreightRate) => {
    const origin = db.locations.find((l: any) => l.id === rate.originId)?.name || '';
    const dest = db.locations.find((l: any) => l.id === rate.destinationId)?.name || '';
    const term = searchTerm.toLowerCase();
    return origin.toLowerCase().includes(term) || dest.toLowerCase().includes(term);
  });

  const inputBaseClass = "w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-inner";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Tabela de Fretes</h2>
        <p className="text-slate-500 text-sm">Configure os valores padrões por rota (tonelada).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-6">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center space-x-2">
              <Plus size={20} className="text-red-600" />
              <span>Nova Rota</span>
            </h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Origem</label>
                <select 
                  className={inputBaseClass + " dark-select"}
                  value={newRate.originId}
                  onChange={e => setNewRate(prev => ({ ...prev, originId: e.target.value }))}
                >
                  <option value="" className="bg-slate-900">Selecione...</option>
                  {db.locations.map((l: any) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Destino</label>
                <select 
                  className={inputBaseClass + " dark-select"}
                  value={newRate.destinationId}
                  onChange={e => setNewRate(prev => ({ ...prev, destinationId: e.target.value }))}
                >
                  <option value="" className="bg-slate-900">Selecione...</option>
                  {db.locations.map((l: any) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Valor por Tonelada (R$)</label>
                <div className="relative">
                  <Calculator className="absolute right-3 top-3 text-slate-400" size={18} />
                  <input 
                    type="number" 
                    step="0.01"
                    className={inputBaseClass}
                    value={newRate.pricePerTon || ''}
                    onChange={e => setNewRate(prev => ({ ...prev, pricePerTon: Number(e.target.value) }))}
                    placeholder="Ex: 150.00"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
              >
                Salvar Rota
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <Search className="text-slate-400 ml-2" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar rotas..."
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 outline-none placeholder-slate-400 ml-4 shadow-inner"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Rota de Transporte</th>
                  <th className="px-6 py-4 text-right">Valor / Tonelada</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-medium">Nenhuma rota cadastrada.</td>
                  </tr>
                ) : (
                  filteredRates.map((rate: FreightRate) => {
                    const origin = db.locations.find((l: any) => l.id === rate.originId);
                    const dest = db.locations.find((l: any) => l.id === rate.destinationId);
                    return (
                      <tr key={rate.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{origin?.name}</span>
                            <div className="flex items-center space-x-1 text-slate-300">
                              <MapPin size={10} />
                              <span className="text-[10px] uppercase font-black tracking-widest">Até</span>
                            </div>
                            <span className="font-bold text-slate-700">{dest?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-lg font-black text-slate-900">
                            R$ {rate.pricePerTon.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(rate.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreightTable;
