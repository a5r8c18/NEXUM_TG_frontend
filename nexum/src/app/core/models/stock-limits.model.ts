export interface StockLimit {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  warehouseId: string;
  warehouseName: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  reorderPoint: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockLimitRequest {
  productId: string;
  warehouseId: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
}

export interface UpdateStockLimitRequest {
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export interface StockLimitWarning {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: 'low_stock' | 'out_of_stock' | 'overstock' | 'optimal';
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}
