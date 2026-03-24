import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { TenantRequest, TENANT_TYPES, TenantType } from '../models/tenant-request.model';

@Injectable({
  providedIn: 'root'
})
export class TenantRequestService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:3001/api/tenant-requests';
  
  // Signals para estado local
  private requests = signal<TenantRequest[]>([]);
  private isLoading = signal(false);
  
  // Obtener todas las solicitudes (para admin)
  getRequests(): Observable<TenantRequest[]> {
    this.isLoading.set(true);
    
    // TODO: Implementar llamada real a API
    // return this.http.get<TenantRequest[]>(this.apiUrl);
    
    // Simulación para desarrollo
    return of(this.getMockRequests()).pipe(
      delay(1000)
    );
  }
  
  // Crear nueva solicitud
  createRequest(request: Omit<TenantRequest, 'status' | 'requestedAt' | 'reviewedAt' | 'reviewedBy' | 'adminNotes' | 'rejectionReason'>): Observable<TenantRequest> {
    console.log('🔥 TENANT REQUEST SERVICE - Método createRequest llamado!');
    
    this.isLoading.set(true);
    
    const newRequest: TenantRequest = {
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
    
    // Usar fetch API temporalmente para evitar problemas con HttpClient
    return new Observable<TenantRequest>(observer => {
      fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequest)
      })
      .then(response => {
        console.log('🌐 TENANT REQUEST SERVICE - Respuesta HTTP:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ TENANT REQUEST SERVICE - Datos guardados en PostgreSQL:', data);
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        console.error('❌ TENANT REQUEST SERVICE - Error en petición:', error);
        observer.error(error);
      });
    });
  }
  
  // Aprobar solicitud
  approveRequest(requestId: string, adminNotes?: string): Observable<TenantRequest> {
    this.isLoading.set(true);
    
    // TODO: Implementar llamada real a API
    // return this.http.patch<TenantRequest>(`${this.apiUrl}/${requestId}/approve`, { adminNotes });
    
    // Simulación para desarrollo
    const request = this.requests().find(r => r.email === requestId); // Mock usando email como ID
    if (request) {
      request.status = 'APPROVED';
      request.reviewedAt = new Date();
      request.reviewedBy = 'admin@nexum.com';
      request.adminNotes = adminNotes;
    }
    
    return of(request!).pipe(
      delay(500)
    );
  }
  
  // Rechazar solicitud
  rejectRequest(requestId: string, rejectionReason: string, adminNotes?: string): Observable<TenantRequest> {
    this.isLoading.set(true);
    
    // TODO: Implementar llamada real a API
    // return this.http.patch<TenantRequest>(`${this.apiUrl}/${requestId}/reject`, { rejectionReason, adminNotes });
    
    // Simulación para desarrollo
    const request = this.requests().find(r => r.email === requestId); // Mock usando email como ID
    if (request) {
      request.status = 'REJECTED';
      request.reviewedAt = new Date();
      request.reviewedBy = 'admin@nexum.com';
      request.rejectionReason = rejectionReason;
      request.adminNotes = adminNotes;
    }
    
    return of(request!).pipe(
      delay(500)
    );
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
