import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { Company } from '../models/company.model';
import { Warehouse } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class ContextService {
  // Signals para estado reactivo
  private currentTenantSignal = signal<Tenant | null>(null);
  private currentCompanySignal = signal<Company | null>(null);
  private currentWarehouseSignal = signal<Warehouse | null>(null);

  // BehaviorSubjects para compatibilidad con código existente
  private currentTenantSubject = new BehaviorSubject<Tenant | null>(null);
  private currentCompanySubject = new BehaviorSubject<Company | null>(null);
  private currentWarehouseSubject = new BehaviorSubject<Warehouse | null>(null);

  // Getters para signals
  get currentTenant() {
    return this.currentTenantSignal;
  }

  get currentCompany() {
    return this.currentCompanySignal;
  }

  get currentWarehouse() {
    return this.currentWarehouseSignal;
  }

  // Getters para Observables
  get currentTenant$(): Observable<Tenant | null> {
    return this.currentTenantSubject.asObservable();
  }

  get currentCompany$(): Observable<Company | null> {
    return this.currentCompanySubject.asObservable();
  }

  get currentWarehouse$(): Observable<Warehouse | null> {
    return this.currentWarehouseSubject.asObservable();
  }

  // Setters
  setCurrentTenant(tenant: Tenant | null): void {
    this.currentTenantSignal.set(tenant);
    this.currentTenantSubject.next(tenant);
    // Limpiar company y warehouse cuando cambia el tenant
    this.setCurrentCompany(null);
    this.setCurrentWarehouse(null);
  }

  setCurrentCompany(company: Company | null): void {
    this.currentCompanySignal.set(company);
    this.currentCompanySubject.next(company);
    // Limpiar warehouse cuando cambia la company
    this.setCurrentWarehouse(null);
  }

  setCurrentWarehouse(warehouse: Warehouse | null): void {
    this.currentWarehouseSignal.set(warehouse);
    this.currentWarehouseSubject.next(warehouse);
  }

  // Métodos de utilidad
  hasActiveTenant(): boolean {
    return this.currentTenantSignal() !== null;
  }

  hasActiveCompany(): boolean {
    return this.currentCompanySignal() !== null;
  }

  hasActiveWarehouse(): boolean {
    return this.currentWarehouseSignal() !== null;
  }

  // Headers para API
  getContextHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    
    if (this.currentTenantSignal()) {
      headers['X-Tenant-ID'] = this.currentTenantSignal()!.id;
    }
    
    if (this.currentCompanySignal()) {
      headers['X-Company-ID'] = this.currentCompanySignal()!.id;
    }
    
    if (this.currentWarehouseSignal()) {
      headers['X-Warehouse-ID'] = this.currentWarehouseSignal()!.id;
    }
    
    return headers;
  }

  // Limpiar todo el contexto
  clearContext(): void {
    this.setCurrentTenant(null);
    this.setCurrentCompany(null);
    this.setCurrentWarehouse(null);
  }
}