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

export interface DirectEntryDto {
  productCode: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  label?: string;
  warehouseId: string;
  entity?: string;
  unitPrice?: number;
  unit?: string;
  location?: string;
  movementCode?: string;
  category?: InventoryCategory;
}

export interface ExitDto {
  productCode: string;
  quantity: number;
  reason?: string;
  entity?: string;
  warehouseId: string;
  unit?: string;
  movementCode?: string;
  category?: InventoryCategory;
}
