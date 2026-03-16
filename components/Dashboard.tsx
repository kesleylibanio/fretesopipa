
import React, { useState, useMemo } from 'react';
import { Search, Plus, History, Settings, Table as TableIcon, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { ViewState, UserSession, Trip } from '../types';

interface DashboardProps {
  navigate: (view: ViewState) => void;
  db: any;
  onSearch: (term: string) => void;
  user: UserSession;
}

const Dashboard: React.FC<DashboardProps> = ({ navigate, db, onSearch, user }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user.role === 'admin';

  // Filtra as viagens baseado no usuário para o resumo do painel
  const trips = useMemo(() => {
    const allTrips = db?.trips || [];
    if (isAdmin) return allTrips;
    
    const sessionDriverId = String(user.driverId || '').trim().toLowerCase();
    const sessionUsername = String(user.username || '').trim().toLowerCase();
    
    return allTrips.filter((t: Trip) => {
      const tripDriver = String(t.driverId || '').trim().toLowerCase();
      return tripDriver === sessionDriverId || tripDriver === sessionUsername;
    });
  }, [db?.trips, user, isAdmin]);

  const customers = db?.customers || [];

  // Estatísticas adaptadas para Admin ou Motorista
  const stats = [
    { 
      label: isAdmin ? 'Viagens no Mês' : 'Minhas Viagens', 
      value: trips.length, 
      icon: TrendingUp, 
      color: 'text-red-600', 
      bg: 'bg-red-50' 
    },
    { 
      label: isAdmin ? 'Total Faturado' : 'Meus Fretes', 
      // Se for motorista, mostramos apenas se o admin permitir ou se for o total do valor do frete dele
      value: isAdmin 
        ? `R$ ${trips.reduce((acc: number, t: any) => acc + (t.totalValue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
        : '***', // Motoristas geralmente não veem o faturamento total da empresa, mas o admin vê
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: isAdmin ? 'Toneladas Transportadas' : 'Minhas Toneladas', 
      value: `${trips.reduce((acc: number, t: any) => acc + (t.qtyTons || 0), 0).toLocaleString('pt-BR')}t`, 
      icon: Package, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
    { 
      label: isAdmin ? 'Clientes Ativos' : 'Acesso Rápido', 
      value: isAdmin ? customers.length : 'Histórico', 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
  ];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
    navigate('history');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Painel de Controle</h2>
          <p className="text-slate-500 mt-1 font-bold text-sm md:text-base">Bem-vindo, {user.username}. Aqui está o seu resumo operacional.</p>
        </div>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <form onSubmit={handleQuickSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input 
              type="text" 
              placeholder={isAdmin ? "Pesquisar por NF, Cliente, Motorista ou Placa..." : "Pesquisar minhas viagens (NF, Cliente)..."}
              className="w-full pl-16 pr-6 py-5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-red-600 text-white px-10 py-5 rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 text-lg active:scale-95 uppercase tracking-widest"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 md:gap-6">
        {[
          { label: 'Nova Viagem', icon: Plus, target: 'new_trip', color: 'bg-red-600' },
          { label: 'Meu Histórico', icon: History, target: 'history', color: 'bg-indigo-600' },
          ...(isAdmin ? [
            { label: 'Cadastros', icon: Settings, target: 'registrations', color: 'bg-slate-800' },
            { label: 'Tabela Frete', icon: TableIcon, target: 'freight_table', color: 'bg-amber-600' }
          ] : []),
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.target as ViewState)}
            className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-2xl hover:border-red-100 transition-all active:scale-95 gap-3 w-full"
          >
            <div className={`${action.color} w-12 h-12 rounded-2xl text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-black/5`}>
              <action.icon size={24} />
            </div>
            <span className="font-black text-slate-800 text-sm tracking-tight text-center word-break-break-word leading-[1.3]">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Seção de Estatísticas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 animate-in slide-in-from-top-4 duration-500">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 w-full">
            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm`}>
              <stat.icon size={24} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] word-break-break-word leading-[1.3]">{stat.label}</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
