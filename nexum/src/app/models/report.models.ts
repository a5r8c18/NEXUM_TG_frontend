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

export interface TransferReport {
  id: string;
  relatedMovementId: string | null;
  movementCode: string | null;
  movementDescription: string | null;
  category: string | null;
  sourceWarehouse: string | null;
  destinationWarehouse: string | null;
  reason: string | null;
  userName: string | null;
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
  date: string;
  created_at: string;
}

export interface TransferReportFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
}
