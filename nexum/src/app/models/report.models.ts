// ========== REPORTES ==========
export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  entity?: string;
  warehouse?: string;
  document?: string;
}

export interface ReceptionReport {
  id: string;
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  details: {
    products: Array<{
      code: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      expirationDate?: string;
    }>;
    totalAmount: number;
  };
  created_at: string;
  updated_at?: string;
}

export interface DeliveryReport {
  id: string;
  entity: string;
  warehouse: string;
  document: string;
  reason: string;
  details: {
    products: Array<{
      code: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    totalAmount: number;
  };
  created_at: string;
  updated_at?: string;
}
