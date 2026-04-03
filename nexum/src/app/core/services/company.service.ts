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

  // Método público para buscar empresas sin autenticación (para login)
  getCompaniesForLogin(email: string): Observable<Company[]> {
    // Solo enviar el email, el backend devolverá todas las empresas activas
    const url = `${this.apiUrl}/public/search?email=${encodeURIComponent(email)}`;
    return this.http.get<Company[]>(url);
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
