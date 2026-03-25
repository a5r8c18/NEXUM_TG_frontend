import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TenantRequest, TENANT_TYPES, TenantType } from '../models/tenant-request.model';

export interface ApprovalResponse {
  message: string;
  token: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantRequestService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:3001/api/tenant-requests'; // Para crear solicitudes
  private adminApiUrl = 'http://localhost:3001/admin/requests'; // Para operaciones de admin
  
  // Signals para estado local
  private requests = signal<TenantRequest[]>([]);
  private isLoading = signal(false);
  
  // Obtener todas las solicitudes (para admin)
  getRequests(): Observable<TenantRequest[]> {
    this.isLoading.set(true);
    
    console.log('🔍 TENANT REQUEST SERVICE - Making request to:', this.adminApiUrl);
    
    // Usar llamada real a API de admin
    return this.http.get<TenantRequest[]>(this.adminApiUrl).pipe(
      catchError((error: any) => {
        console.error('❌ TENANT REQUEST SERVICE - Error details:', error);
        console.error('📡 URL:', this.adminApiUrl);
        console.error('🔍 Status:', error.status);
        console.error('📝 Message:', error.message);
        console.error('📦 Error:', error.error);
        throw error;
      })
    );
  }
  
  // Crear nueva solicitud
  createRequest(request: Omit<TenantRequest, 'id' | 'status' | 'requestedAt' | 'reviewedAt' | 'reviewedBy' | 'adminNotes' | 'rejectionReason'>): Observable<TenantRequest> {
    console.log('🔥 TENANT REQUEST SERVICE - Método createRequest llamado!');
    
    this.isLoading.set(true);
    
    const newRequest: Omit<TenantRequest, 'id'> = {
      ...request,
      status: 'PENDING',
      requestedAt: new Date()
    };
    
    console.group('🌐 TENANT REQUEST SERVICE - Enviando petición REAL al backend');
    console.log('📡 URL:', this.apiUrl);
    console.log('📤 Payload:', newRequest);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔥 CONECTANDO CON BACKEND REAL - PostgreSQL');
    console.groupEnd();
    
    // Usar HttpClient para mejor manejo de errores
    return this.http.post<TenantRequest>(this.apiUrl, newRequest).pipe(
      tap(response => {
        console.log('✅ TENANT REQUEST SERVICE - Datos guardados en PostgreSQL:', response);
      }),
      catchError((error: any) => {
        console.group('❌ TENANT REQUEST SERVICE - Error en petición');
        console.error('Error completo:', error);
        console.log('Tipo de error:', error?.constructor?.name);
        console.log('Mensaje:', error?.message || 'Sin mensaje');
        console.log('Status HTTP:', error?.status || 'N/A');
        console.log('Status Text:', error?.statusText || 'N/A');
        console.log('URL:', this.apiUrl);
        console.log('Request data:', newRequest);
        console.log('Error response:', error?.error || 'N/A');
        console.groupEnd();
        throw error;
      })
    );
  }
  
  // Aprobar solicitud
  approveRequest(requestId: string, adminNotes?: string): Observable<ApprovalResponse> {
    this.isLoading.set(true);
    
    console.log('🔍 TENANT REQUEST SERVICE - Approve request called');
    console.log('🔍 TENANT REQUEST SERVICE - Request ID:', requestId);
    console.log('🔍 TENANT REQUEST SERVICE - Admin Notes:', adminNotes);
    console.log('🔍 TENANT REQUEST SERVICE - URL:', `${this.adminApiUrl}/${requestId}/approve`);
    
    const body = { approvedBy: 'admin@nexum.com', adminNotes: adminNotes || null };
    console.log('🔍 TENANT REQUEST SERVICE - Request body:', body);
    
    // Usar fetch API directamente para evitar problemas con HttpClient
    return new Observable<ApprovalResponse>(observer => {
      fetch(`${this.adminApiUrl}/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })
      .then(response => {
        console.log('🔍 TENANT REQUEST SERVICE - Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ TENANT REQUEST SERVICE - Request successful:', data);
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        console.error('❌ TENANT REQUEST SERVICE - Fetch error:', error);
        observer.error(error);
      })
      .finally(() => {
        this.isLoading.set(false);
      });
    });
  }
  
  // Rechazar solicitud
  rejectRequest(requestId: string, rejectionReason: string, adminNotes?: string): Observable<TenantRequest> {
    this.isLoading.set(true);
    
    console.log('🔍 TENANT REQUEST SERVICE - Reject request called');
    console.log('🔍 TENANT REQUEST SERVICE - Request ID:', requestId);
    console.log('🔍 TENANT REQUEST SERVICE - Rejection Reason:', rejectionReason);
    console.log('🔍 TENANT REQUEST SERVICE - Admin Notes:', adminNotes);
    console.log('🔍 TENANT REQUEST SERVICE - URL:', `${this.adminApiUrl}/${requestId}/deny`);
    
    const body = { reason: rejectionReason, deniedBy: 'admin@nexum.com', adminNotes: adminNotes || null };
    console.log('🔍 TENANT REQUEST SERVICE - Request body:', body);
    
    // Usar fetch API directamente para evitar problemas con HttpClient
    return new Observable<TenantRequest>(observer => {
      fetch(`${this.adminApiUrl}/${requestId}/deny`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })
      .then(response => {
        console.log('🔍 TENANT REQUEST SERVICE - Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ TENANT REQUEST SERVICE - Request successful:', data);
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        console.error('❌ TENANT REQUEST SERVICE - Fetch error:', error);
        observer.error(error);
      })
      .finally(() => {
        this.isLoading.set(false);
      });
    });
  }
  
  // Obtener tipos de tenant disponibles
  getTenantTypes(): TenantType[] {
    return TENANT_TYPES;
  }
  
  // Signals getters
  get requestsSignal() {
    return this.requests;
  }
  
  get isLoadingSignal() {
    return this.isLoading;
  }
  
  // Datos mock para desarrollo
  private getMockRequests(): TenantRequest[] {
    return [
      {
        id: 'mock-1',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@consultora.com',
        phone: '+1234567890',
        position: 'Gerente de TI',
        companyName: 'Consultora ABC',
        industry: 'Consultoría',
        country: 'México',
        tenantType: 'MULTI_COMPANY',
        useCase: 'Gestionar las operaciones de 15 clientes de contabilidad',
        message: 'Necesitamos una solución robusta para manejar múltiples empresas',
        status: 'PENDING',
        requestedAt: new Date('2024-01-15')
      },
      {
        id: 'mock-2',
        firstName: 'María',
        lastName: 'González',
        email: 'maria@tienda.local',
        phone: '+0987654321',
        position: 'Dueña',
        companyName: 'Tienda Local',
        industry: 'Retail',
        country: 'Argentina',
        tenantType: 'SINGLE_COMPANY',
        useCase: 'Control de inventario y facturación para mi tienda',
        message: 'Busco algo simple pero completo para mi negocio',
        status: 'PENDING',
        requestedAt: new Date('2024-01-16')
      }
    ];
  }
}
