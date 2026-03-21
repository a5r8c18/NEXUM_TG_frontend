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
