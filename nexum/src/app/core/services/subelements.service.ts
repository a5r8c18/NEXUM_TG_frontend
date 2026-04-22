import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SubelementCategory =
  | 'inventory'
  | 'fuel'
  | 'energy'
  | 'personnel'
  | 'depreciation'
  | 'services'
  | 'transfers';

export interface Subelement {
  id: string;
  companyId: number;
  code: string;
  name: string;
  category: SubelementCategory;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubelementFilters {
  category?: SubelementCategory;
  search?: string;
  activeOnly?: boolean;
}

export interface SubelementStatistics {
  total: number;
  active: number;
  byCategory: Record<SubelementCategory, { total: number; active: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class SubelementsService {
  private readonly apiUrl = 'http://localhost:3001/accounting/subelements';

  constructor(private http: HttpClient) {}

  findAll(filters?: SubelementFilters): Observable<Subelement[]> {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      params.append('category', filters.category);
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    if (filters?.activeOnly) {
      params.append('activeOnly', 'true');
    }

    const url = params.toString() ? `${this.apiUrl}?${params.toString()}` : this.apiUrl;
    return this.http.get<Subelement[]>(url);
  }

  findOne(id: string): Observable<Subelement> {
    return this.http.get<Subelement>(`${this.apiUrl}/${id}`);
  }

  findByCode(code: string): Observable<Subelement | null> {
    return this.http.get<Subelement>(`${this.apiUrl}/code/${code}`);
  }

  create(data: Partial<Subelement>): Observable<Subelement> {
    return this.http.post<Subelement>(this.apiUrl, data);
  }

  update(id: string, data: Partial<Subelement>): Observable<Subelement> {
    return this.http.put<Subelement>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<SubelementCategory[]> {
    return this.http.get<SubelementCategory[]>(`${this.apiUrl}/categories`);
  }

  getStatistics(): Observable<SubelementStatistics> {
    return this.http.get<SubelementStatistics>(`${this.apiUrl}/statistics`);
  }
}
