// ========== EMPRESAS (Companies) ==========
export interface Company {
  id: number;
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  tenant_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateCompanyDto {
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  tenant_type?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  tenant_type?: string;
}
