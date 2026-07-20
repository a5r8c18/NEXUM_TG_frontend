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

export interface EmployeeContract {
  id: string;
  companyId: number;
  employeeId: string;
  employeeName: string;
  contractType: string;
  position: string | null;
  startDate: string;
  endDate: string | null;
  salary: number;
  status: 'active' | 'expired' | 'terminated' | 'suspended';
  documentUrl: string | null;
  notes: string | null;
}

export interface Attendance {
  id: string;
  companyId: number;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday';
  notes: string | null;
}

export interface LeaveRequest {
  id: string;
  companyId: number;
  employeeId: string;
  employeeName: string;
  type: 'vacation' | 'sick' | 'unpaid' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
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

  // ── Contratos ──
  getContracts(filters?: { employeeId?: string; status?: string }) {
    const params: any = {};
    if (filters?.employeeId) params.employeeId = filters.employeeId;
    if (filters?.status) params.status = filters.status;
    return this.http.get<EmployeeContract[]>(`${this.baseUrl}/contracts`, { params });
  }
  createContract(data: Partial<EmployeeContract>) {
    return this.http.post<EmployeeContract>(`${this.baseUrl}/contracts`, data);
  }
  updateContract(id: string, data: Partial<EmployeeContract>) {
    return this.http.put<EmployeeContract>(`${this.baseUrl}/contracts/${id}`, data);
  }
  deleteContract(id: string) {
    return this.http.delete(`${this.baseUrl}/contracts/${id}`);
  }

  // ── Asistencia ──
  getAttendance(filters?: { employeeId?: string; date?: string; from?: string; to?: string; status?: string }) {
    const params: any = {};
    if (filters?.employeeId) params.employeeId = filters.employeeId;
    if (filters?.date) params.date = filters.date;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.status) params.status = filters.status;
    return this.http.get<Attendance[]>(`${this.baseUrl}/attendance`, { params });
  }
  createAttendance(data: Partial<Attendance>) {
    return this.http.post<Attendance>(`${this.baseUrl}/attendance`, data);
  }
  updateAttendance(id: string, data: Partial<Attendance>) {
    return this.http.put<Attendance>(`${this.baseUrl}/attendance/${id}`, data);
  }
  deleteAttendance(id: string) {
    return this.http.delete(`${this.baseUrl}/attendance/${id}`);
  }

  // ── Vacaciones / Licencias ──
  getLeaves(filters?: { employeeId?: string; status?: string; type?: string }) {
    const params: any = {};
    if (filters?.employeeId) params.employeeId = filters.employeeId;
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/leaves`, { params });
  }
  createLeave(data: Partial<LeaveRequest>) {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/leaves`, data);
  }
  updateLeave(id: string, data: Partial<LeaveRequest>) {
    return this.http.put<LeaveRequest>(`${this.baseUrl}/leaves/${id}`, data);
  }
  setLeaveStatus(id: string, status: 'approved' | 'rejected' | 'cancelled', approvedBy?: string) {
    return this.http.put<LeaveRequest>(`${this.baseUrl}/leaves/${id}/status`, { status, approvedBy });
  }
  deleteLeave(id: string) {
    return this.http.delete(`${this.baseUrl}/leaves/${id}`);
  }
}
