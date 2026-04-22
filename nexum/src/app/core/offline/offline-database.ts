import Dexie, { type Table } from 'dexie';

// ─── Interfaces para las tablas locales ───

export interface OfflineInventoryItem {
  id?: number;
  companyId: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_value?: number;
  warehouse?: string;
  warehouseId?: string;
  expiration_date?: string;
  entry_date?: string;
  supplier?: string;
  lastSyncedAt?: string;
}

export interface OfflineMovement {
  id?: string;
  companyId: number;
  movement_type: 'entry' | 'exit' | 'return' | 'transfer';
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  reason?: string;
  warehouseId?: string;
  warehouse_name?: string;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  date: string;
  created_by?: string;
  lastSyncedAt?: string;
}

export interface OfflineInvoice {
  id?: string;
  companyId: number;
  invoiceNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxId?: string;
  status: 'pending' | 'paid' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  dueDate?: string;
  issueDate: string;
  items: OfflineInvoiceItem[];
  lastSyncedAt?: string;
}

export interface OfflineInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OfflineWarehouse {
  id?: string;
  companyId: number;
  name: string;
  address?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface OfflineCompany {
  id?: number;
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  tenantId?: string;
  lastSyncedAt?: string;
}

export interface OfflineAccount {
  id?: string;
  companyId: number;
  code: string;
  name: string;
  type: string;
  nature: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface OfflineEmployee {
  id?: string;
  companyId: number;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  departmentId?: string;
  salary?: number;
  hireDate?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface OfflineFixedAsset {
  id?: number;
  companyId: number;
  name: string;
  description?: string;
  acquisitionDate: string;
  acquisitionValue: number;
  currentValue: number;
  depreciationRate: number;
  groupNumber?: string;
  status: string;
  lastSyncedAt?: string;
}

export interface OfflineStockLimit {
  id?: string;
  companyId: number;
  productCode: string;
  productName: string;
  minStock: number;
  maxStock: number;
  warehouseId?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

// ─── Cola de sincronización ───

export interface SyncQueueItem {
  id?: number;
  entity: string;        // 'inventory' | 'movement' | 'invoice' | etc.
  action: 'create' | 'update' | 'delete';
  entityId?: string;     // ID de la entidad afectada
  payload: string;       // JSON stringified del dato
  timestamp: string;     // ISO date
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  errorMessage?: string;
  companyId: number;
}

// ─── Metadata de sincronización ───

export interface SyncMetadata {
  id?: number;
  entity: string;
  companyId: number;
  lastSyncedAt: string;
  recordCount: number;
}

// ─── Base de datos Dexie ───

export class OfflineDatabase extends Dexie {
  inventory!: Table<OfflineInventoryItem, number>;
  movements!: Table<OfflineMovement, string>;
  invoices!: Table<OfflineInvoice, string>;
  warehouses!: Table<OfflineWarehouse, string>;
  companies!: Table<OfflineCompany, number>;
  accounts!: Table<OfflineAccount, string>;
    employees!: Table<OfflineEmployee, string>;
  fixedAssets!: Table<OfflineFixedAsset, number>;
  stockLimits!: Table<OfflineStockLimit, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  syncMetadata!: Table<SyncMetadata, number>;

  constructor() {
    super('NexumOfflineDB');

    this.version(1).stores({
      inventory: '++id, companyId, product_code, product_name, warehouseId',
      movements: 'id, companyId, movement_type, product_code, date, warehouseId',
      invoices: 'id, companyId, customerName, status, issueDate',
      warehouses: 'id, companyId, name, isActive',
      companies: 'id, name, tenantId',
      accounts: 'id, companyId, code, name, type, parentId',
      journalEntries: 'id, companyId, entryNumber, date, accountCode, status',
      employees: 'id, companyId, firstName, lastName, departmentId',
      fixedAssets: '++id, companyId, name, status, groupNumber',
      stockLimits: 'id, companyId, productCode, warehouseId',
      syncQueue: '++id, entity, action, status, timestamp, companyId',
      syncMetadata: '++id, [entity+companyId]',
    });
  }
}

export const offlineDb = new OfflineDatabase();
