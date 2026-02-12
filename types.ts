
export interface Customer {
  id: string;
  name: string;
}

export interface Driver {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  plate: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
}

export interface FreightRate {
  id: string;
  originId: string;
  destinationId: string;
  pricePerTon: number;
}

export interface Trip {
  id: string;
  date: string;
  invoiceNumber: string;
  customerId: string;
  driverId: string;
  vehicleId: string;
  originId: string;
  destinationId: string;
  materialId: string;
  qtyTons: number;
  pricePerTon: number;
  totalValue: number;
  createdAt: number;
  invoiceImageUrl?: string;
}

export interface Login {
  id: string;
  username: string;
  password?: string; // Campo de senha individual
  role: 'admin' | 'driver';
}

export interface UserSession {
  username: string;
  role: 'admin' | 'driver';
  driverId?: string;
}

export type ViewState = 'dashboard' | 'new_trip' | 'history' | 'registrations' | 'freight_table';
export type RegistrationType = 'customers' | 'drivers' | 'vehicles' | 'locations' | 'materials';
