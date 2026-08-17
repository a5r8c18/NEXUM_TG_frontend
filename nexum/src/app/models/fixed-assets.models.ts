export interface DepreciationSubgroup {
  name: string;
  rate: number;
}

export interface DepreciationGroup {
  group_number: number;
  group_name: string;
  subgroups: DepreciationSubgroup[];
}

export type AcquisitionConcept = 'compra' | 'donacion' | 'sobrante';

export type DisposalConcept =
  | 'faltante'
  | 'deterioro'
  | 'venta'
  | 'devolucion_compra'
  | 'obsolescencia'
  | 'rotura'
  | 'donacion';

export interface FixedAssetArea {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  isActive: boolean;
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
  acquisitionType?: AcquisitionConcept;
  disposalType?: DisposalConcept | null;
  disposalDate?: string | null;
  disposalReason?: string | null;
  location?: string;
  areaId?: number;
  area?: FixedAssetArea;
  responsiblePerson?: string;
  employeeId?: string;
  costCenterId?: string;
  costCenter?: { id: string; name: string; expenseAccountCode?: string };
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
  acquisitionType?: AcquisitionConcept;
  location?: string;
  areaId?: number;
  employeeId?: string;
  costCenterId?: string;
  responsiblePerson?: string;
}

export interface UpdateFixedAssetDto {
  name?: string;
  description?: string;
  location?: string;
  areaId?: number;
  employeeId?: string;
  costCenterId?: string;
  responsiblePerson?: string;
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
  disposalType: DisposalConcept;
  disposalDate?: string;
  bankAccountId?: string;
  saleAmount?: number;
}

export interface RevalueAssetDto {
  newValue: number;
  reason: string;
  revaluationDate: string;
  appraisalReference?: string;
}
