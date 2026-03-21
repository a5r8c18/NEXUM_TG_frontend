import { Warehouse } from './warehouse.model';

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  taxId: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warehouses?: Warehouse[];
}

export interface CreateCompanyRequest {
  name: string;
  taxId: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}