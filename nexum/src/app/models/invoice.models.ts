export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId?: string;
  customerAddress?: string;
  customerPhone?: string;
  date: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceDto {
  customerName: string;
  customerId?: string;
  customerAddress?: string;
  customerPhone?: string;
  date?: string;
  taxRate?: number;
  discount?: number;
  notes?: string;
  createdByName?: string;
  items: InvoiceItem[];
}

export interface InvoiceFilters {
  customerName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
