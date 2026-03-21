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
  asset_code: string;
  name: string;
  description?: string;
  group_number: number;
  subgroup: string;
  subgroup_detail?: string;
  acquisition_value: number;
  acquisition_date: string;
  location?: string;
  responsible_person?: string;
  depreciation_rate: number;
  current_value: number;
  status: 'active' | 'disposed' | 'transferred';
  created_at: string;
  updated_at: string;
}

export interface CreateFixedAssetDto {
  asset_code: string;
  name: string;
  description?: string;
  group_number: number;
  subgroup: string;
  subgroup_detail?: string;
  acquisition_value: number;
  acquisition_date: string;
  location?: string;
  responsible_person?: string;
}

export interface UpdateFixedAssetDto {
  name?: string;
  description?: string;
  location?: string;
  responsible_person?: string;
  status?: 'active' | 'disposed' | 'transferred';
}

export interface FixedAssetFilters {
  status?: string;
  group_number?: number;
  search?: string;
}
