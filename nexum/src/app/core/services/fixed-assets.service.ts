import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  FixedAsset, 
  FixedAssetArea,
  CreateFixedAssetDto, 
  UpdateFixedAssetDto, 
  DepreciationGroup,
  FixedAssetFilters,
  DisposeAssetDto,
  RevalueAssetDto,
  AcquisitionConcept,
  DisposalConcept,
  PendingInvestigation,
  ResolveInvestigationDto,
  AddImprovementDto,
  TransferAssetDto
} from '../../models/fixed-assets.models';

@Injectable({
  providedIn: 'root'
})
export class FixedAssetsService {
  private readonly apiUrl = `${environment.apiUrl}/fixed-assets`;

  constructor(private http: HttpClient) {}

  getFixedAssets(filters?: FixedAssetFilters): Observable<FixedAsset[]> {
    let params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.set('status', filters.status);
      if (filters.groupNumber) params.set('group_number', filters.groupNumber.toString());
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

  disposeAsset(id: string, data: DisposeAssetDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/dispose`, data);
  }

  revalueAsset(id: string, data: RevalueAssetDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/revalue`, data);
  }

  getPendingInvestigations(): Observable<PendingInvestigation[]> {
    return this.http
      .get<{ investigations: PendingInvestigation[] }>(`${this.apiUrl}/investigations`)
      .pipe(map(response => response.investigations || []));
  }

  resolveInvestigation(id: string | number, data: ResolveInvestigationDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/resolve-investigation`, data);
  }

  addImprovement(id: string, data: AddImprovementDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/improvement`, data);
  }

  transferAsset(id: string, data: TransferAssetDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/transfer`, data);
  }

  downloadActa(id: string, type: 'baja' | 'recepcion'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/acta/${type}`, { responseType: 'blob' });
  }

  processDepreciation(year: number, month: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/depreciation/process`, { year, month });
  }

  getDepreciationCatalog(): Observable<DepreciationGroup[]> {
    return this.http.get<{ catalog: DepreciationGroup[] }>(`${this.apiUrl}/depreciation-catalog`)
      .pipe(map(response => response.catalog || []));
  }

  getAreas(): Observable<FixedAssetArea[]> {
    return this.http.get<FixedAssetArea[]>(`${this.apiUrl}/areas`);
  }

  createArea(data: Partial<FixedAssetArea>): Observable<FixedAssetArea> {
    return this.http.post<FixedAssetArea>(`${this.apiUrl}/areas`, data);
  }

  updateArea(id: number, data: Partial<FixedAssetArea>): Observable<FixedAssetArea> {
    return this.http.put<FixedAssetArea>(`${this.apiUrl}/areas/${id}`, data);
  }

  deleteArea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/areas/${id}`);
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

export type { FixedAsset, FixedAssetArea, CreateFixedAssetDto, UpdateFixedAssetDto, DepreciationGroup, FixedAssetFilters, DisposeAssetDto, RevalueAssetDto, AcquisitionConcept, DisposalConcept, PendingInvestigation, ResolveInvestigationDto, AddImprovementDto, TransferAssetDto };
