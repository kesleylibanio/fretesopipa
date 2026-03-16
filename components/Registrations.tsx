
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Gestão de Cadastros</h2>
          <p className="text-slate-500 mt-1 font-bold text-sm md:text-base">Controle de base operacional e acessos de motoristas.</p>
        </div>
        {activeTab === 'drivers' && (
          <button onClick={resetAllLogins} className="flex items-center justify-center space-x-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95">
            <RefreshCcw size={16} />
            <span>Sincronizar Acessos</span>
          </button>
        )}
      </header>

      <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide -mx-2 px-2 w-full max-w-full">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => { setActiveTab(tab.id as RegistrationType); setIsEditing(null); }} 
            className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-black transition-all whitespace-nowrap uppercase text-[11px] tracking-[0.15em] border-2 ${
              activeTab === tab.id 
                ? 'bg-red-600 text-white border-red-600 shadow-xl shadow-red-500/20' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100 shadow-sm hover:border-slate-200'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 md:p-10 border-b border-slate-50 bg-slate-50/30">
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Informação Principal</label>
                <input 
                  type="text" 
                  placeholder={activeTab === 'vehicles' ? 'Placa (ABC-1234)' : `Nome do ${currentTab.label.slice(0, -1)}...`} 
                  className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none shadow-sm font-bold text-lg" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                />
              </div>
              {activeTab === 'drivers' && (
                <>
                  <div className="w-full lg:w-56">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Usuário</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Usuário" 
                        className="w-full pl-14 pr-6 py-5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none shadow-sm font-bold text-lg" 
                        value={newUsername} 
                        onChange={e => setNewUsername(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-56">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Senha" 
                        className="w-full pl-14 pr-6 py-5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none shadow-sm font-bold text-lg" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="w-full lg:w-auto">
                <button 
                  type="submit" 
                  className="w-full lg:w-auto bg-red-600 text-white px-10 py-5 rounded-2xl font-black hover:bg-red-700 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-red-500/20 active:scale-95 uppercase text-sm tracking-widest"
                >
                  <Plus size={24} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Filtrar lista..." 
                  className="pl-14 pr-6 py-4 rounded-2xl border border-slate-200 bg-white text-slate-600 placeholder-slate-400 focus:ring-4 focus:ring-slate-100 outline-none w-full shadow-sm text-base font-bold" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                {filteredItems.length} Registros
              </div>
            </div>
          </form>
        </div>

        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-32 text-center">
              <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-inner">
                <currentTab.icon size={48} />
              </div>
              <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Lista vazia ou sem resultados</p>
            </div>
          ) : (
            filteredItems.map((item: any) => {
              const driverLogin = activeTab === 'drivers' ? findDriverLogin(item.id, item.name) : null;
              return (
                <div key={item.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50/50 transition-colors group gap-6">
                  {isEditing === item.id ? (
                    <div className="flex-1 space-y-4 animate-in slide-in-from-left-2 duration-300">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <input autoFocus type="text" className="px-5 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-bold shadow-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                        {activeTab === 'drivers' && (
                          <>
                            <input type="text" className="px-5 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-bold shadow-sm" value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Usuário" />
                            <input type="text" className="px-5 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-bold shadow-sm" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nova Senha" />
                          </>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={() => handleUpdate(item.id)} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">Salvar Alterações</button>
                        <button onClick={() => setIsEditing(null)} className="flex-1 bg-slate-200 text-slate-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-all">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:border-red-100 group-hover:text-red-500 group-hover:shadow-lg group-hover:shadow-red-500/5 transition-all duration-300">
                          <currentTab.icon size={28} />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xl tracking-tighter block">{item.name || item.plate}</span>
                          {activeTab === 'drivers' && (
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2">
                              <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                <KeyRound size={12} className="text-red-500" />
                                <span>Acesso: <span className="text-slate-900">{driverLogin?.username || 'Pendente'}</span></span>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span>ID: <span className="text-slate-900 font-mono">{String(item.id).substring(0,8)}</span></span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 self-end md:self-center">
                        <button 
                          onClick={() => { setIsEditing(item.id); setEditName(item.name || item.plate); setEditUsername(driverLogin?.username || ''); setEditPassword(driverLogin?.password || ''); }} 
                          className="flex items-center space-x-2 bg-white px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:border-red-600 hover:text-red-600 hover:shadow-lg transition-all"
                        >
                          <Edit2 size={16} />
                          <span>Editar</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 text-slate-300 hover:border-red-600 hover:text-red-600 hover:shadow-lg transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
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
