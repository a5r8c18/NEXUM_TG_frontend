import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { Company } from '../models/company.model';
import { Warehouse } from '../models/warehouse.model';

const STORAGE_KEYS = {
  TENANT: 'nexum_current_tenant',
  COMPANY: 'nexum_current_company',
  WAREHOUSE: 'nexum_current_warehouse'
};

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

  constructor() {
    this.restoreFromStorage();
  }

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
    this.persistToStorage(STORAGE_KEYS.TENANT, tenant);
    // NO limpiar company y warehouse cuando cambia el tenant si ya hay una empresa activa
    // Esto evita que el usuario CEO pierda su empresa asignada
    if (tenant === null) {
      this.setCurrentCompany(null);
    }
  }

  setCurrentCompany(company: Company | null): void {
    this.currentCompanySignal.set(company);
    this.currentCompanySubject.next(company);
    this.persistToStorage(STORAGE_KEYS.COMPANY, company);
    // Limpiar warehouse cuando cambia la company
    if (company === null) {
      this.setCurrentWarehouse(null);
    }
  }

  setCurrentWarehouse(warehouse: Warehouse | null): void {
    this.currentWarehouseSignal.set(warehouse);
    this.currentWarehouseSubject.next(warehouse);
    this.persistToStorage(STORAGE_KEYS.WAREHOUSE, warehouse);
  }

  // Dynamic company switching
  switchCompany(company: Company): void {
    // Clear warehouse when switching companies
    this.setCurrentWarehouse(null);
    // Set new company
    this.setCurrentCompany(company);
  }

  // Get available companies for current user
  getAvailableCompanies(): Company[] {
    // This would typically come from user data or API
    // For now, return empty array - should be populated from AuthService
    return [];
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
    this.currentTenantSignal.set(null);
    this.currentTenantSubject.next(null);
    this.currentCompanySignal.set(null);
    this.currentCompanySubject.next(null);
    this.currentWarehouseSignal.set(null);
    this.currentWarehouseSubject.next(null);
    localStorage.removeItem(STORAGE_KEYS.TENANT);
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.WAREHOUSE);
  }

  // Persistencia en localStorage
  private persistToStorage(key: string, value: unknown): void {
    if (value) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.removeItem(key);
    }
  }

  private restoreFromStorage(): void {
    try {
      const tenant = localStorage.getItem(STORAGE_KEYS.TENANT);
      if (tenant) {
        const parsed = JSON.parse(tenant) as Tenant;
        this.currentTenantSignal.set(parsed);
        this.currentTenantSubject.next(parsed);
      }

      const company = localStorage.getItem(STORAGE_KEYS.COMPANY);
      if (company) {
        const parsed = JSON.parse(company) as Company;
        this.currentCompanySignal.set(parsed);
        this.currentCompanySubject.next(parsed);
      }

      const warehouse = localStorage.getItem(STORAGE_KEYS.WAREHOUSE);
      if (warehouse) {
        const parsed = JSON.parse(warehouse) as Warehouse;
        this.currentWarehouseSignal.set(parsed);
        this.currentWarehouseSubject.next(parsed);
      }
    } catch {
      this.clearContext();
    }
  }
}