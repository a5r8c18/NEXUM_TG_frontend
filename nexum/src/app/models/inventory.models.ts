// ========== INVENTORY ==========
export interface InventoryItem {
  productCode: string;
  productName: string;
  productDescription?: string;
  entries: number;
  exits: number;
  stock: number;
  stockLimit?: number;
  unitPrice?: number;
  createdAt?: string;
  warehouse?: string;
  warehouseId?: string;
  entity?: string;
  productUnit?: string;
}

export interface InventoryFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  expirationDate?: string;
  entity?: string;
  warehouse?: string;
  minStock?: number;
  maxStock?: number;
  search?: string;
  isActive?: boolean;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
}

// ========== MOVEMENTS ==========
export interface MovementProduct {
  productName: string;
  productCode: string;
  stock: number;
  entity?: string;
  warehouse?: string;
  warehouseId?: string;
  unitPrice?: number;
  productUnit?: string;
}

export type InventoryCategory = 'insumo' | 'mercancia' | 'produccion';

export interface MovementItem {
  id?: string;
  product: MovementProduct;
  type: 'entry' | 'exit' | 'return' | 'transfer' | 'ENTRY' | 'EXIT' | 'RETURN' | 'TRANSFER';
  quantity: number;
  createdAt: string;
  reason?: string;
  label?: string;
  purchaseId?: string;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  movementCode?: string;
  movementDescription?: string;
  category?: InventoryCategory;
  unitPrice?: number;
  totalAmount?: number;
  relatedMovementId?: string;
  expenseElement?: string;
  voucherId?: string;
  purchase?: {
    id: string;
    document: string;
    createdAt: string;
  };
}

export interface MovementTypeOption {
  code: string;
  description: string;
  direction: 'entry' | 'exit';
  category: InventoryCategory;
}

export interface MovementFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  warehouse?: string;
  movement_type?: string;
}

// ── Entry ──
export interface EntryItemDto {
  productCode: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  unitPrice?: number;
  unit?: string;
  location?: string;
  expenseElement?: string;
}

export interface DirectEntryDto {
  movementCode: string;
  category?: InventoryCategory;
  label?: string;
  entity?: string;
  warehouseId: string;
  items?: EntryItemDto[];
  // Backward compat (single product)
  productCode?: string;
  productName?: string;
  productDescription?: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  location?: string;
  expenseElement?: string;
}

// ── Exit ──
export interface ExitItemDto {
  productCode: string;
  quantity: number;
  expenseElement?: string;
}

export interface ExitDto {
  movementCode: string;
  category?: InventoryCategory;
  warehouseId: string;
  reason?: string;
  entity?: string;
  expenseElement?: string;
  items?: ExitItemDto[];
  // Backward compat (single product)
  productCode?: string;
  quantity?: number;
}

// ── Transfer ──
export interface TransferItemDto {
  productCode: string;
  quantity: number;
}

export interface TransferDto {
  movementCode: string;
  category?: InventoryCategory;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  reason?: string;
  items?: TransferItemDto[];
  // Backward compat
  productCode?: string;
  quantity?: number;
}

// ── Return ──
export interface ReturnItemDto {
  productCode: string;
  quantity: number;
}

export interface ReturnDto {
  movementCode: string;
  category?: InventoryCategory;
  warehouseId: string;
  reason: string;
  purchase_id?: string;
  entity?: string;
  items?: ReturnItemDto[];
  // Backward compat
  product_code?: string;
  quantity?: number;
}
