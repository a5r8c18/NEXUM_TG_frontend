import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  FixedAsset, 
  CreateFixedAssetDto, 
  UpdateFixedAssetDto, 
  DepreciationGroup,
  FixedAssetFilters 
} from '../../models/fixed-assets.models';

@Injectable({
  providedIn: 'root'
})
export class FixedAssetsService {
  private readonly apiUrl = 'http://localhost:3001/fixed-assets';

  constructor(private http: HttpClient) {}

  getFixedAssets(filters?: FixedAssetFilters): Observable<FixedAsset[]> {
    let params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.set('status', filters.status);
      if (filters.group_number) params.set('group_number', filters.group_number.toString());
      if (filters.search) params.set('search', filters.search);
    }
    const url = params.toString() ? `${this.apiUrl}?${params}` : this.apiUrl;
    return this.http.get<{ assets: FixedAsset[] }>(url)
      .pipe(map(response => response.assets || []));
  }

  getFixedAssetById(id: string): Observable<FixedAsset> {
    return this.http.get<{ asset: FixedAsset }>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.asset));
  }

  createFixedAsset(asset: CreateFixedAssetDto): Observable<FixedAsset> {
    return this.http.post<{ asset: FixedAsset }>(this.apiUrl, asset)
      .pipe(map(response => response.asset));
  }

  updateFixedAsset(id: string, data: UpdateFixedAssetDto): Observable<FixedAsset> {
    return this.http.put<{ asset: FixedAsset }>(`${this.apiUrl}/${id}`, data)
      .pipe(map(response => response.asset));
  }

  deleteFixedAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDepreciationCatalog(): Observable<DepreciationGroup[]> {
    return this.http.get<{ catalog: DepreciationGroup[] }>(`${this.apiUrl}/depreciation-catalog`)
      .pipe(map(response => response.catalog || []));
  }

  exportToExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/excel`, { responseType: 'blob' });
  }

  exportToPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/pdf`, { responseType: 'blob' });
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }
}

export type { FixedAsset, CreateFixedAssetDto, UpdateFixedAssetDto, DepreciationGroup, FixedAssetFilters };
