
import React, { useState } from 'react';
import { Search, Plus, History, Settings, Table as TableIcon, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { ViewState, UserSession } from '../types';

interface DashboardProps {
  navigate: (view: ViewState) => void;
  db: any;
  onSearch: (term: string) => void;
  user: UserSession;
}

const Dashboard: React.FC<DashboardProps> = ({ navigate, db, onSearch, user }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const trips = db?.trips || [];
  const customers = db?.customers || [];

  const isAdmin = user.role === 'admin';
  
  // As estatísticas só fazem sentido para o admin
  const stats = [
    { label: 'Viagens no Mês', value: trips.length, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Faturado', value: `R$ ${trips.reduce((acc: number, t: any) => acc + (t.totalValue || 0), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Toneladas Transportadas', value: `${trips.reduce((acc: number, t: any) => acc + (t.qtyTons || 0), 0).toLocaleString('pt-BR')}t`, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Clientes Ativos', value: customers.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
    navigate('history');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel de Controle</h2>
        <p className="text-slate-500 mt-1 font-medium">Bem-vindo, {user.username}. Aqui está o resumo operacional.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleQuickSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input 
              type="text" 
              placeholder="Pesquisar por NF, Cliente, Motorista ou Placa..."
              className="w-full pl-14 pr-6 py-5 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-400 focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-inner font-bold text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-100 text-xl active:scale-95"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Nova Viagem', icon: Plus, target: 'new_trip', color: 'bg-red-600' },
          { label: 'Histórico', icon: History, target: 'history', color: 'bg-indigo-600' },
          ...(isAdmin ? [
            { label: 'Cadastros', icon: Settings, target: 'registrations', color: 'bg-slate-700' },
            { label: 'Tabela Frete', icon: TableIcon, target: 'freight_table', color: 'bg-amber-600' }
          ] : []),
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.target as ViewState)}
            className="group flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-100 transition-all active:scale-95"
          >
            <div className={`${action.color} p-5 rounded-2xl text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-black/5`}>
              <action.icon size={32} />
            </div>
            <span className="font-black text-slate-700 text-lg">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Seção de Estatísticas: Visível apenas para Admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-500">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
