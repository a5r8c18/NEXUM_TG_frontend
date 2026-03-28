export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  FACTURADOR = 'facturador'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId?: number;
  tenantId?: string;
  tenantName?: string;
  tenantType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  token?: string;
  tenantType?: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
}
