export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  isActive: boolean;
  type: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  createdAt: string;
  updatedAt: string;
  settings?: {
    maxCompanies: number;
    maxUsers: number;
    features: string[];
  };
}

export interface TenantSettings {
  maxCompanies: number;
  maxUsers: number;
  features: string[];
}

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  isActive?: boolean;
  settings?: Partial<TenantSettings>;
}