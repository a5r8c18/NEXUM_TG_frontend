import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../../models/company.models';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private apiUrl = `${environment.apiUrl}/companies`;

  constructor(private http: HttpClient) {}

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl);
  }

  getCompany(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/${id}`);
  }

  // Nuevo método para buscar empresas por nombre
  getCompaniesByName(name: string): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}?search=${name}`);
  }

  // Nuevo método para buscar empresas por tenant
  getCompaniesByTenant(tenantId: string): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}?tenantId=${tenantId}`);
  }

  createCompany(data: CreateCompanyDto): Observable<Company> {
    return this.http.post<Company>(this.apiUrl, data);
  }

  updateCompany(id: number, data: UpdateCompanyDto): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/${id}`, data);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
