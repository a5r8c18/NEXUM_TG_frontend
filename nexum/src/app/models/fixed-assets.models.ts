export interface DepreciationSubgroup {
  name: string;
  rate: number;
}

export interface DepreciationGroup {
  group_number: number;
  group_name: string;
  subgroups: DepreciationSubgroup[];
}

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  groupNumber: number;
  subgroup: string;
  subgroupDetail?: string;
  acquisitionValue: number;
  acquisitionDate: string;
  location?: string;
  responsiblePerson?: string;
  employeeId?: string;
  depreciationRate: number;
  currentValue: number;
  status: 'active' | 'disposed' | 'transferred';
  created_at: string;
  updated_at: string;
  companyId?: number;
}

export interface CreateFixedAssetDto {
  assetCode: string;
  name: string;
  description?: string;
  groupNumber: number;
  subgroup: string;
  subgroupDetail?: string;
  acquisitionValue: number;
  acquisitionDate: string;
  location?: string;
  responsiblePerson?: string;
  employeeId?: string;
}

export interface UpdateFixedAssetDto {
  name?: string;
  description?: string;
  location?: string;
  responsiblePerson?: string;
  employeeId?: string;
  status?: 'active' | 'disposed' | 'transferred';
}

export interface FixedAssetFilters {
  status?: string;
  groupNumber?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FixedAssetsResponse {
  assets: FixedAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DisposeAssetDto {
  reason: string;
  disposalType: 'deterioro' | 'obsolescencia' | 'rotura' | 'faltante' | 'venta' | 'donacion';
  disposalDate?: string;
  bankAccountId?: string;
  saleAmount?: number;
}
