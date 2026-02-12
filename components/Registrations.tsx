
import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, User, Users, Truck, MapPin, Package, Lock, ShieldCheck, KeyRound, RefreshCcw, AlertTriangle } from 'lucide-react';
import { RegistrationType, Driver, Login } from '../types';
import { generateId } from '../db';

interface RegistrationsProps {
  db: any;
  setDb: (updater: (prev: any) => any) => Promise<boolean>;
}

const Registrations: React.FC<RegistrationsProps> = ({ db, setDb }) => {
  const [activeTab, setActiveTab] = useState<RegistrationType>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const tabs = [
    { id: 'customers', label: 'Clientes', icon: Users, list: db.customers },
    { id: 'drivers', label: 'Motoristas', icon: User, list: db.drivers },
    { id: 'vehicles', label: 'Veículos', icon: Truck, list: db.vehicles },
    { id: 'locations', label: 'Locais', icon: MapPin, list: db.locations },
    { id: 'materials', label: 'Materiais', icon: Package, list: db.materials },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  const normalizeForLogin = (str: string) => {
    if (!str) return "";
    return str.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .trim()
              .replace(/\s/g, '.');
  };

  const findDriverLogin = (driverId: string, driverName: string) => {
    // Busca primeiro pelo ID exato, se não encontrar tenta pelo nome normalizado
    let login = db.logins.find((l: Login) => l.id === driverId);
    if (login) return login;

    const normalizedName = normalizeForLogin(driverName);
    return db.logins.find((l: Login) => 
      l.role === 'driver' && 
      (l.username.toLowerCase() === normalizedName || l.username.toLowerCase() === driverName.toLowerCase().trim())
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const cleanName = newName.trim();
    // Usamos o próprio nome/placa como ID para facilitar a leitura na planilha
    const sharedId = cleanName;
    const field = activeTab === 'vehicles' ? 'plate' : 'name';
    
    const newItem = { id: sharedId, [field]: cleanName };
    
    const success = await setDb(prev => {
      const next = { ...prev };
      
      // Verifica se já existe
      const alreadyExists = prev[activeTab].some((item: any) => (item.id === sharedId));
      if (alreadyExists) {
        alert("Este registro já existe.");
        return prev;
      }

      next[activeTab] = [...prev[activeTab], newItem];
      
      if (activeTab === 'drivers') {
        const username = (newUsername.trim() || normalizeForLogin(cleanName));
        next.logins = [...prev.logins, {
          id: sharedId,
          username: username,
          password: (newPassword.trim() || '123456'),
          role: 'driver' as const
        }];
      }
      return next;
    });

    if (success) {
      setNewName('');
      setNewUsername('');
      setNewPassword('');
    }
  };

  const handleUpdate = async (id: string) => {
    const field = activeTab === 'vehicles' ? 'plate' : 'name';
    const cleanNewName = editName.trim();

    const success = await setDb(prev => {
      const next = { ...prev };
      next[activeTab] = prev[activeTab].map((item: any) => 
        item.id === id ? { ...item, [field]: cleanNewName } : item
      );

      if (activeTab === 'drivers') {
        next.logins = prev.logins.map((l: Login) => {
          if (l.id === id) {
            return { 
              ...l, 
              username: editUsername.trim() || l.username, 
              password: editPassword.trim() || l.password 
            };
          }
          return l;
        });
      }
      return next;
    });
    
    if (success) setIsEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro PERMANENTEMENTE da planilha?')) return;
    
    await setDb(prev => {
      const next = { ...prev };
      const currentList = prev[activeTab] || [];
      next[activeTab] = currentList.filter((item: any) => item.id !== id);
      
      if (activeTab === 'drivers') {
        next.logins = (prev.logins || []).filter((l: Login) => {
          if (l.role === 'admin') return true;
          return l.id !== id;
        });
      }

      return next;
    });
  };

  const resetAllLogins = async () => {
    if (!confirm('Isso resetará os acessos com base nos IDs atuais dos motoristas. Continuar?')) return;

    await setDb(prev => {
      const adminLogins = prev.logins.filter((l: Login) => l.role === 'admin');
      const newDriverLogins = prev.drivers.map((driver: Driver) => ({
        id: driver.id,
        username: normalizeForLogin(driver.name),
        password: '123456',
        role: 'driver' as const
      }));

      return {
        ...prev,
        logins: [...adminLogins, ...newDriverLogins]
      };
    });
  };

  const filteredItems = (currentTab.list || []).filter((item: any) => {
    const val = item.name || item.plate || '';
    return val.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Cadastros</h2>
          <p className="text-slate-500 text-sm font-medium">Controle de base operacional e acessos de motoristas.</p>
        </div>
        {activeTab === 'drivers' && (
          <button onClick={resetAllLogins} className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95">
            <RefreshCcw size={14} /><span>Sincronizar IDs de Acesso</span>
          </button>
        )}
      </header>

      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id as RegistrationType); setIsEditing(null); }} className={`flex items-center space-x-2 px-6 py-4 rounded-2xl font-black transition-all whitespace-nowrap uppercase text-[10px] tracking-widest ${activeTab === tab.id ? 'bg-red-600 text-white shadow-xl shadow-red-200 ring-4 ring-red-500/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'}`}>
            <tab.icon size={16} /><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input type="text" placeholder={activeTab === 'vehicles' ? 'Placa (ABC-1234)' : `Nome do ${currentTab.label.slice(0, -1)}...`} className="w-full px-5 py-4 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-400 focus:ring-4 focus:ring-red-500/20 outline-none shadow-inner font-bold" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              {activeTab === 'drivers' && (
                <>
                  <div className="md:w-48 relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input type="text" placeholder="Usuário" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-4 focus:ring-red-500/20 outline-none shadow-inner font-bold" value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
                  <div className="md:w-48 relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input type="text" placeholder="Senha (123456)" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-4 focus:ring-red-500/20 outline-none shadow-inner font-bold" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                </>
              )}
              <button type="submit" className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-red-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-red-200 active:scale-95 uppercase text-xs tracking-widest"><Plus size={20} /><span>Adicionar</span></button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-[1px] flex-1 bg-slate-200"></div>
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Filtrar lista..." className="pl-12 pr-6 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 placeholder-slate-400 focus:ring-4 focus:ring-slate-100 outline-none w-full md:w-80 shadow-sm text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            </div>
          </form>
        </div>

        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-20 text-center"><div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><currentTab.icon size={40} /></div><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Lista vazia ou sem resultados</p></div>
          ) : (
            filteredItems.map((item: any) => {
              const driverLogin = activeTab === 'drivers' ? findDriverLogin(item.id, item.name) : null;
              return (
                <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors group">
                  {isEditing === item.id ? (
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col md:flex-row gap-2">
                        <input autoFocus type="text" className="flex-1 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none focus:ring-4 focus:ring-red-500/20 font-bold" value={editName} onChange={e => setEditName(e.target.value)} />
                        {activeTab === 'drivers' && (
                          <><input type="text" className="md:w-48 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none focus:ring-4 focus:ring-red-500/20 font-bold" value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Usuário" /><input type="text" className="md:w-48 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none focus:ring-4 focus:ring-red-500/20 font-bold" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nova Senha" /></>
                        )}
                        <div className="flex space-x-2"><button onClick={() => handleUpdate(item.id)} className="flex-1 md:flex-none p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Check size={20} className="mx-auto" /></button><button onClick={() => setIsEditing(null)} className="flex-1 md:flex-none p-3 bg-slate-200 text-slate-600 rounded-xl"><X size={20} className="mx-auto" /></button></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:border-red-100 group-hover:text-red-500 transition-all"><currentTab.icon size={24} /></div>
                        <div>
                          <span className="font-black text-slate-800 text-lg tracking-tight">{item.name || item.plate}</span>
                          {activeTab === 'drivers' && (
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1 text-[10px] font-black uppercase text-slate-400 tracking-tighter"><KeyRound size={12} className="text-red-400" /><span>Acesso: <span className="text-slate-900">{driverLogin?.username || 'Pendente'}</span></span></div>
                              <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                              <div className="flex items-center space-x-1 text-[10px] font-black uppercase text-slate-400 tracking-tighter"><ShieldCheck size={12} className="text-emerald-500" /><span>ID: <span className="text-slate-900">{String(item.id).substring(0,10)}...</span></span></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setIsEditing(item.id); setEditName(item.name || item.plate); setEditUsername(driverLogin?.username || ''); setEditPassword(driverLogin?.password || ''); }} className="flex-1 md:flex-none flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:border-red-600 hover:text-red-600 transition-all shadow-sm"><Edit2 size={14} /><span className="uppercase tracking-widest">Editar</span></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-400 hover:border-red-600 hover:text-red-600 transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;
