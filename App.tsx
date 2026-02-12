
import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  History, 
  Settings, 
  Table as TableIcon, 
  Plus, 
  Menu, 
  X, 
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Lock,
  ArrowRight,
  User as UserIcon,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { ViewState, Trip, UserSession } from './types';
import { fetchDB, pushDB, INITIAL_DB, DB } from './db';
import Dashboard from './components/Dashboard';
import NewTripForm from './components/NewTripForm';
import TripHistory from './components/TripHistory';
import Registrations from './components/Registrations';
import FreightTable from './components/FreightTable';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [db, setDb] = useState<DB>(INITIAL_DB);
  const dbRef = useRef<DB>(INITIAL_DB); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Processando...');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchDB();
      setDb(data);
      return data;
    } catch (error: any) {
      console.error("Erro na carga inicial:", error);
      setLoadError(error.message || "Erro de conexão com o banco de dados.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncToCloud = async (targetDb: DB) => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      const success = await pushDB(targetDb);
      setSyncStatus(success ? 'success' : 'error');
      if (success) {
        setTimeout(() => setSyncStatus('idle'), 3000);
        return true;
      }
      return false;
    } catch (e) {
      setSyncStatus('error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateDB = async (updater: (prev: DB) => DB) => {
    try {
      const nextDb = updater(dbRef.current);
      setDb(nextDb);
      syncToCloud(nextDb).catch(err => {
        console.error("Erro na sincronização de background:", err);
      });
      return true;
    } catch (err: any) {
      console.error("Erro ao preparar atualização local:", err);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode !== '2025') {
      setErrorMessage('Código de Acesso Geral incorreto.');
      setLoginError(true);
      setTimeout(() => { setLoginError(false); setErrorMessage(''); }, 2000);
      return;
    }

    setIsLoading(true);
    const currentDb = await loadData();
    
    if (loginUsername.toLowerCase() === 'admin' && userPassword === '2025') {
      const adminSession: UserSession = { username: 'admin', role: 'admin' };
      setSession(adminSession);
      localStorage.setItem('fs_pipa_session', JSON.stringify(adminSession));
      return;
    }

    if (!currentDb) {
      setIsLoading(false);
      return;
    }

    let foundLogin = currentDb.logins.find(l => l.username.toLowerCase() === loginUsername.toLowerCase());
    
    if (foundLogin && String(foundLogin.password) === String(userPassword)) {
      const driverEntry = currentDb.drivers.find(d => d.name.toLowerCase() === foundLogin?.username.toLowerCase());
      
      const userSession: UserSession = { 
        username: foundLogin.username, 
        role: foundLogin.role,
        driverId: driverEntry?.id
      };
      setSession(userSession);
      localStorage.setItem('fs_pipa_session', JSON.stringify(userSession));
    } else {
      setErrorMessage('Usuário ou Senha Pessoal incorretos.');
      setLoginError(true);
      setTimeout(() => { setLoginError(false); setErrorMessage(''); }, 2000);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('fs_pipa_session');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setSession(parsedSession);
      loadData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const navigate = (nextView: ViewState) => {
    if (nextView !== 'new_trip') setEditingTrip(null);
    setView(nextView);
    setIsSidebarOpen(false);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setView('new_trip');
  };

  const logout = () => {
    localStorage.removeItem('fs_pipa_session');
    setSession(null);
    setLoginUsername('');
    setUserPassword('');
    setPasscode('');
    setLoadError(null);
    setView('dashboard');
    setIsSidebarOpen(false);
  };

  const NavItem = ({ icon: Icon, label, target }: { icon: any, label: string, target: ViewState }) => (
    <button
      onClick={() => navigate(target)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        view === target 
          ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {isProcessing && (
        <div className="fixed inset-0 z-[160] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 animate-in fade-in duration-300">
          <Loader2 size={64} className="text-red-500 animate-spin" />
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-2">{processingLabel}</h2>
            <p className="text-slate-400 font-bold text-sm">Aguarde um momento...</p>
          </div>
        </div>
      )}

      {!session ? (
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6 py-12">
          <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } } .shake { animation: shake 0.2s ease-in-out 0s 2; }`}</style>
          <div className={`bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl transition-all duration-300 ${loginError ? 'shake ring-4 ring-red-500/50' : ''}`}>
            <div className="text-center mb-8">
              <div className="bg-red-600 w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-200 rotate-3">
                <Truck size={36} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Fretes Só Pipa</h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Segurança Multi-Fator</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / Motorista</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 font-bold text-slate-700" placeholder="Seu nome de usuário" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Senha Pessoal</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 font-bold text-slate-700" placeholder="••••••••" value={userPassword} onChange={e => setUserPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 text-red-600">Código de Acesso Geral</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                  <input type="password" className="w-full pl-12 pr-4 py-3.5 bg-red-50 border-2 border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 font-black text-xl tracking-[0.5em] text-center text-red-600" placeholder="••••" maxLength={4} value={passcode} onChange={e => setPasscode(e.target.value)} />
                </div>
              </div>
              {errorMessage && <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 py-2 rounded-xl border border-red-100">{errorMessage}</p>}
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center space-x-3 hover:bg-red-600 transition-all shadow-xl active:scale-95 mt-4">
                <span>Entrar no Sistema</span>
                <ArrowRight size={20} />
              </button>
            </form>
            <div className="mt-8 flex items-center justify-center space-x-2 text-slate-300">
              <div className="h-[1px] w-8 bg-slate-200"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Ambiente Criptografado</p>
              <div className="h-[1px] w-8 bg-slate-200"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2">
            {isSyncing && (
              <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-pulse">
                <RefreshCw size={18} className="text-red-400 animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest">Sincronizando...</span>
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-emerald-400 animate-in fade-in slide-in-from-right-4">
                <CheckCircle2 size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Salvo na Cloud</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-red-400 animate-in shake">
                <AlertTriangle size={18} />
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest">Erro de Rede</span>
                  <span className="text-[10px] opacity-80 uppercase tracking-tight">Tentaremos novamente</span>
                </div>
              </div>
            )}
          </div>

          <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center space-x-2"><div className="bg-red-600 p-1.5 rounded-lg text-white"><Truck size={20} /></div><h1 className="font-bold text-lg text-slate-800">Fretes Só Pipa</h1></div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">{isSidebarOpen ? <X size={24} /> : <Menu size={24} />}</button>
            </div>
          </header>

          <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-full flex flex-col p-4">
              <div className="hidden md:flex items-center space-x-3 px-2 mb-8 mt-2"><div className="bg-red-600 p-2 rounded-xl text-white"><Truck size={24} /></div><h1 className="font-extrabold text-xl tracking-tight text-slate-800">Fretes Só Pipa</h1></div>
              <nav className="flex-1 space-y-2">
                <NavItem icon={BarChart3} label="Dashboard" target="dashboard" />
                <NavItem icon={Plus} label="Nova Viagem" target="new_trip" />
                <NavItem icon={History} label="Histórico" target="history" />
                {session?.role === 'admin' && <NavItem icon={Settings} label="Cadastros" target="registrations" />}
                {session?.role === 'admin' && <NavItem icon={TableIcon} label="Tabela de Fretes" target="freight_table" />}
              </nav>
              <div className="pt-4 border-t mt-auto">
                <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors mb-4"><X size={20} /><span className="font-bold text-xs uppercase tracking-widest">Sair do Sistema</span></button>
                <div className="bg-slate-50 p-3 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600 uppercase">{session?.role === 'admin' ? 'ADM' : 'DRV'}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 leading-none text-[10px] uppercase truncate max-w-[140px]">{session?.username}</p>
                    <p className="text-[10px] font-bold mt-1 text-red-600 uppercase">Conexão Ativa</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              {view === 'dashboard' && <Dashboard navigate={navigate} db={db} onSearch={setGlobalSearch} user={session!} />}
              {view === 'new_trip' && (
                <NewTripForm 
                  db={db} 
                  user={session!}
                  initialData={editingTrip || undefined}
                  onSave={async (savedTrip) => {
                    updateDB(prev => ({
                      ...prev,
                      trips: editingTrip 
                        ? prev.trips.map(t => t.id === savedTrip.id ? savedTrip : t)
                        : [savedTrip, ...prev.trips]
                    }));
                    setEditingTrip(null);
                    navigate('history');
                  }}
                  onCancel={() => { setEditingTrip(null); navigate('dashboard'); }}
                />
              )}
              {view === 'history' && (
                <TripHistory 
                  db={db} 
                  user={session!}
                  initialSearch={globalSearch} 
                  onEdit={handleEditTrip}
                  onDelete={async (id) => {
                    if(confirm("Deseja excluir esta viagem permanentemente da planilha?")) {
                      updateDB(prev => ({ ...prev, trips: prev.trips.filter(t => t.id !== id) }));
                    }
                  }}
                />
              )}
              {view === 'registrations' && session?.role === 'admin' && <Registrations db={db} setDb={updateDB} />}
              {view === 'freight_table' && session?.role === 'admin' && (
                <FreightTable db={db} setDb={updateDB} />
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
