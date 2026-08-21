import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
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

interface FixedAssetPage {
  assets: FixedAsset[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateFixedAssetResult {
  asset: FixedAsset;
  /** Aviso contable no bloqueante devuelto por el backend (p. ej. proveedor inexistente). */
  accountingWarning?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FixedAssetsService {
  private readonly apiUrl = `${environment.apiUrl}/fixed-assets`;

  /** Tamaño de página solicitado al backend, que pagina el listado siempre. */
  private static readonly PAGE_SIZE = 200;

  private cachedAssets: FixedAsset[] | null = null;
  private cachedCatalog: DepreciationGroup[] | null = null;

  constructor(private http: HttpClient) {}

  private getFixedAssetsPage(
    page: number,
    filters?: FixedAssetFilters,
  ): Observable<FixedAssetPage> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.set('status', filters.status);
      if (filters.groupNumber) params.set('group_number', filters.groupNumber.toString());
      if (filters.search) params.set('search', filters.search);
    }
    params.set('page', String(page));
    params.set('limit', String(FixedAssetsService.PAGE_SIZE));
    return this.http.get<FixedAssetPage>(`${this.apiUrl}?${params}`);
  }

  /**
   * Listado completo de activos fijos.
   *
   * El backend pagina siempre (50 registros por omisión), por lo que se
   * recorren todas las páginas: los totales y las exportaciones del módulo se
   * calculan sobre el universo completo y no sobre la primera página.
   *
   * Se cachea en memoria para evitar recargas innecesarias al navegar entre
   * submódulos. Use `refreshFixedAssets()` para forzar recarga.
   */
  getFixedAssets(filters?: FixedAssetFilters, useCache = true): Observable<FixedAsset[]> {
    if (useCache && this.cachedAssets && !filters) {
      return of(this.cachedAssets);
    }
    return this.getFixedAssetsPage(1, filters).pipe(
      switchMap(first => {
        const assets = first.assets || [];
        const totalPages = first.pagination?.totalPages ?? 1;
        if (totalPages <= 1) {
          if (!filters) this.cachedAssets = assets;
          return of(assets);
        }
        const remaining: Observable<FixedAssetPage>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          remaining.push(this.getFixedAssetsPage(page, filters));
        }
        return forkJoin(remaining).pipe(
          map(pages => {
            const all = assets.concat(...pages.map(p => p.assets || []));
            if (!filters) this.cachedAssets = all;
            return all;
          }),
        );
      }),
    );
  }

  refreshFixedAssets(): Observable<FixedAsset[]> {
    this.cachedAssets = null;
    return this.getFixedAssets(undefined, false);
  }

  getFixedAssetById(id: string): Observable<FixedAsset> {
    return this.http.get<{ asset: FixedAsset }>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.asset));
  }

  createFixedAsset(asset: CreateFixedAssetDto): Observable<CreateFixedAssetResult> {
    return this.http.post<CreateFixedAssetResult>(this.apiUrl, asset).pipe(
      tap(() => this.cachedAssets = null)
    );
  }

  updateFixedAsset(id: string, data: UpdateFixedAssetDto): Observable<FixedAsset> {
    return this.http.put<{ asset: FixedAsset }>(`${this.apiUrl}/${id}`, data)
      .pipe(
        map(response => response.asset),
        tap(() => this.cachedAssets = null)
      );
  }

  deleteFixedAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.cachedAssets = null)
    );
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

  getDepreciationCatalog(useCache = true): Observable<DepreciationGroup[]> {
    if (useCache && this.cachedCatalog) {
      return of(this.cachedCatalog);
    }
    return this.http.get<{ catalog: DepreciationGroup[] }>(`${this.apiUrl}/depreciation-catalog`)
      .pipe(
        map(response => {
          const catalog = response.catalog || [];
          this.cachedCatalog = catalog;
          return catalog;
        })
      );
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
