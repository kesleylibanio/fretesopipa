
import { 
  Customer, Driver, Vehicle, Location, Material, FreightRate, Trip, Login 
} from './types';

// URL da API do Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzk7E2yRlmtn2oz9GZWoLAsv2wCW47KKRkKA6OhGHUydzqhss_F39D9k9f7cpbxvpiJ/exec';

// Token de Segurança (Deve ser igual no Apps Script)
const SECURITY_TOKEN = 'LOGITRANS_SECRET_2025';

export interface DB {
  customers: Customer[];
  drivers: Driver[];
  vehicles: Vehicle[];
  locations: Location[];
  materials: Material[];
  freightRates: FreightRate[];
  trips: Trip[];
  logins: Login[];
  recentIds: Record<string, string[]>;
}

export const INITIAL_DB: DB = {
  customers: [],
  drivers: [],
  vehicles: [],
  locations: [],
  materials: [],
  freightRates: [],
  trips: [],
  logins: [],
  recentIds: {}
};

export const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
  }
};

const mapToSheet = (data: any[], type: string) => {
  if (!data || !Array.isArray(data)) return [];

  if (type === 'trips') {
    return data.map((t: Trip) => ({
      id: String(t.id),
      data: t.date,
      nota_fiscal: String(t.invoiceNumber),
      cliente_id: String(t.customerId),
      motorista_id: String(t.driverId),
      veiculo_id: String(t.vehicleId),
      local_carregamento_id: String(t.originId),
      local_descarga_id: String(t.destinationId),
      material_id: String(t.materialId),
      quantidade_toneladas: Number(t.qtyTons),
      valor_tonelada: Number(t.pricePerTon),
      valor_total: Number(t.totalValue),
      foto_nota: t.invoiceImageUrl || ''
    }));
  }
  if (type === 'logins') {
    return data.map((l: Login) => ({
      id: String(l.id),
      username: String(l.username),
      senha: String(l.password || '').trim(),
      role: String(l.role)
    }));
  }
  if (type === 'freightRates') {
    return data.map((f: FreightRate) => ({
      id: String(f.id),
      local_origem_id: String(f.originId),
      local_destino_id: String(f.destinationId),
      valor_tonelada: Number(f.pricePerTon)
    }));
  }
  if (type === 'vehicles') {
    return data.map((v: Vehicle) => ({ id: String(v.id), placa: String(v.plate) }));
  }
  return data.map(item => ({
    id: String(item.id),
    nome: String(item.name)
  }));
};

const mapFromSheet = (data: any[], type: string) => {
  if (!data || !Array.isArray(data)) return [];
  
  if (type === 'trips') {
    return data.map((t: any) => ({
      id: String(t.id || ''),
      date: t.data || '',
      invoiceNumber: String(t.nota_fiscal || ''),
      customerId: String(t.cliente_id || ''),
      driverId: String(t.motorista_id || ''),
      vehicleId: String(t.veiculo_id || ''),
      originId: String(t.local_carregamento_id || ''),
      destinationId: String(t.local_descarga_id || ''),
      materialId: String(t.material_id || ''),
      qtyTons: Number(t.quantidade_toneladas || 0),
      pricePerTon: Number(t.valor_tonelada || 0),
      totalValue: Number(t.valor_total || 0),
      createdAt: Date.now(),
      invoiceImageUrl: String(t.foto_nota || '')
    }));
  }
  if (type === 'logins') {
    return data.map((l: any) => ({
      id: String(l.id || ''),
      username: String(l.username || ''),
      password: String(l.senha || ''), 
      role: String(l.role || 'driver') as 'admin' | 'driver'
    }));
  }
  if (type === 'freightRates') {
    return data.map((f: any) => ({
      id: String(f.id || ''),
      originId: String(f.local_origem_id || ''),
      destinationId: String(f.local_destino_id || ''),
      pricePerTon: Number(f.valor_tonelada || 0)
    }));
  }
  if (type === 'vehicles') {
    return data.map((v: any) => ({ 
      id: String(v.id || ''), 
      plate: String(v.placa || '') 
    }));
  }
  return data.map(item => ({
    id: String(item.id || ''),
    name: String(item.nome || '')
  }));
};

export const fetchDB = async (retries = 2): Promise<DB> => {
  try {
    const url = `${API_URL}?token=${SECURITY_TOKEN}&action=read&_t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`Erro na rede (Status: ${response.status}).`);
    }
    
    const rawData = await response.json();
    
    if (rawData.error) {
      throw new Error(`Erro do Servidor: ${rawData.error}`);
    }
    
    return {
      customers: mapFromSheet(rawData.Clientes, 'customers') as Customer[],
      drivers: mapFromSheet(rawData.Motoristas, 'drivers') as Driver[],
      vehicles: mapFromSheet(rawData.Veiculos, 'vehicles') as Vehicle[],
      locations: mapFromSheet(rawData.Locais, 'locations') as Location[],
      materials: mapFromSheet(rawData.Materiais, 'materials') as Material[],
      freightRates: mapFromSheet(rawData.Fretes, 'freightRates') as FreightRate[],
      trips: mapFromSheet(rawData.Viagens, 'trips') as Trip[],
      logins: mapFromSheet(rawData.Logins, 'logins') as Login[],
      recentIds: rawData.Metadata?.recentIds || {}
    };
  } catch (error: any) {
    if (retries > 0) return fetchDB(retries - 1);
    throw new Error(error.message);
  }
};

export const pushDB = async (db: DB): Promise<boolean> => {
  try {
    const payload = {
      token: SECURITY_TOKEN,
      Viagens: mapToSheet(db.trips, 'trips'),
      Clientes: mapToSheet(db.customers, 'customers'),
      Motoristas: mapToSheet(db.drivers, 'drivers'),
      Veiculos: mapToSheet(db.vehicles, 'vehicles'),
      Locais: mapToSheet(db.locations, 'locations'),
      Materiais: mapToSheet(db.materials, 'materials'),
      Fretes: mapToSheet(db.freightRates, 'freightRates'),
      Logins: mapToSheet(db.logins, 'logins')
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow', 
      body: JSON.stringify(payload),
      headers: { 
        'Content-Type': 'text/plain;charset=utf-8' 
      }
    });
    
    if (!response.ok) return false;
    
    const result = await response.text();
    return result.trim().toLowerCase().includes("success");
  } catch (error) {
    console.error('Erro de sincronização:', error);
    return false;
  }
};
