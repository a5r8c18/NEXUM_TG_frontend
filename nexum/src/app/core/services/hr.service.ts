import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Employee {
  id: string;
  companyId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  departmentId: string | null;
  departmentName: string | null;
  hireDate: string | null;
  salary: number;
  contractType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  status: 'active' | 'inactive' | 'on_leave';
  address: string | null;
  documentId: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: number;
  name: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  employeeCount: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class HrService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/hr`;

  getEmployees(filters?: { status?: string; departmentId?: string; search?: string; contractType?: string }) {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    if (filters?.search) params.search = filters.search;
    if (filters?.contractType) params.contractType = filters.contractType;
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`, { params });
  }

  getEmployeeStatistics() {
    return this.http.get<any>(`${this.baseUrl}/employees/statistics`);
  }

  createEmployee(data: Partial<Employee>) {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, data);
  }

  updateEmployee(id: string, data: Partial<Employee>) {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, data);
  }

  deleteEmployee(id: string) {
    return this.http.delete(`${this.baseUrl}/employees/${id}`);
  }

  getDepartments() {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`);
  }

  createDepartment(data: Partial<Department>) {
    return this.http.post<Department>(`${this.baseUrl}/departments`, data);
  }

  updateDepartment(id: string, data: Partial<Department>) {
    return this.http.put<Department>(`${this.baseUrl}/departments/${id}`, data);
  }

  deleteDepartment(id: string) {
    return this.http.delete(`${this.baseUrl}/departments/${id}`);
  }
}
