export interface Warehouse {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  code?: string;
  address?: string;
  isActive?: boolean;
}