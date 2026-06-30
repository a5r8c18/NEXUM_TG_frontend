// ========== COMPRAS ==========
export interface PurchaseProductForm {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  amount: number;
  unitPrice: number;
  expirationDate?: string | null;
}

export interface CreatePurchasePayload {
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  // Cuentas contables seleccionadas por el usuario (override de defaults)
  debitAccountCode?: string;
  creditAccountCode?: string;
  // Transportista y responsables (para reportes de recepción)
  transportista?: {
    nombre?: string;
    ci?: string;
    chapa?: string;
  };
  responsables?: {
    jefeAlmacen?: string;
    recepcionadoPor?: string;
    anotadoPor?: string;
    contabilizadoPor?: string;
  };
  notes?: string;
  products: CreatePurchaseProductPayload[];
}

export interface CreatePurchaseProductPayload {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit?: string | null;
  expiration_date?: string | null;
}

export interface Purchase {
  id: string;
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseDetailProduct {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productUnit: string;
  category?: string | null;
}

export interface PurchaseDetailResponse {
  purchase: Purchase;
  products: PurchaseDetailProduct[];
}
