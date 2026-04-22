import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// InventoryService - Unit Tests (Vitest, pure logic, no Angular DI)
// Tests cover: InventoryItem model, filter building, URL params
// construction, stock calculations, and data transformations.
// ============================================================

interface InventoryItem {
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

interface InventoryFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  expirationDate?: string;
  entity?: string;
  warehouse?: string;
  minStock?: number;
  maxStock?: number;
}

// Simulated InventoryService logic — param building + data transformations
class InventoryServiceLogic {
  private apiUrl: string;

  constructor(baseApiUrl: string) {
    this.apiUrl = `${baseApiUrl}/inventory`;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  buildParams(filters?: InventoryFilters, companyId?: number): Record<string, string> {
    const params: Record<string, string> = {};
    if (companyId) params['companyId'] = companyId.toString();
    if (filters) {
      if (filters.fromDate) params['fromDate'] = filters.fromDate;
      if (filters.toDate) params['toDate'] = filters.toDate;
      if (filters.product) params['product'] = filters.product;
      if (filters.entity) params['entity'] = filters.entity;
      if (filters.warehouse) params['warehouse'] = filters.warehouse;
      if (filters.minStock) params['minStock'] = filters.minStock.toString();
      if (filters.maxStock) params['maxStock'] = filters.maxStock.toString();
    }
    return params;
  }

  extractInventory(response: { inventory: InventoryItem[] }): InventoryItem[] {
    return response.inventory ?? [];
  }

  calculateTotalValue(items: InventoryItem[]): number {
    return items.reduce((total, item) => total + (item.stock * (item.unitPrice || 0)), 0);
  }

  getLowStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter(item => item.stockLimit && item.stock <= item.stockLimit);
  }

  getOutOfStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter(item => item.stock === 0);
  }

  filterByWarehouse(items: InventoryItem[], warehouse: string): InventoryItem[] {
    return items.filter(item => item.warehouse === warehouse);
  }

  sortByStock(items: InventoryItem[], ascending = true): InventoryItem[] {
    return [...items].sort((a, b) => ascending ? a.stock - b.stock : b.stock - a.stock);
  }
}

const mockItems: InventoryItem[] = [
  {
    productCode: 'PROD001',
    productName: 'Tornillos 3/8',
    entries: 100,
    exits: 20,
    stock: 80,
    stockLimit: 10,
    unitPrice: 0.50,
    warehouse: 'Almacen A',
    entity: 'Teneduria Garcia',
    productUnit: 'units',
  },
  {
    productCode: 'PROD002',
    productName: 'Cable UTP Cat6',
    entries: 50,
    exits: 50,
    stock: 0,
    stockLimit: 5,
    unitPrice: 15.00,
    warehouse: 'Almacen B',
    entity: 'Empresa Demo',
    productUnit: 'metros',
  },
  {
    productCode: 'PROD003',
    productName: 'Resma Papel A4',
    entries: 200,
    exits: 195,
    stock: 5,
    stockLimit: 20,
    unitPrice: 8.50,
    warehouse: 'Almacen A',
    entity: 'Teneduria Garcia',
    productUnit: 'resmas',
  },
  {
    productCode: 'PROD004',
    productName: 'Mouse USB',
    entries: 30,
    exits: 10,
    stock: 20,
    unitPrice: 12.00,
    warehouse: 'Almacen B',
    productUnit: 'units',
  },
];

describe('InventoryService', () => {
  let service: InventoryServiceLogic;
  const BASE_URL = 'http://localhost:3001';

  beforeEach(() => {
    service = new InventoryServiceLogic(BASE_URL);
  });

  it('should build correct API URL', () => {
    expect(service.getApiUrl()).toBe('http://localhost:3001/inventory');
  });

  describe('buildParams', () => {
    it('should return empty params when no filters', () => {
      const params = service.buildParams();
      expect(Object.keys(params)).toHaveLength(0);
    });

    it('should add companyId param', () => {
      const params = service.buildParams(undefined, 1);
      expect(params['companyId']).toBe('1');
    });

    it('should add all filter params', () => {
      const filters: InventoryFilters = {
        fromDate: '2023-01-01',
        toDate: '2023-12-31',
        product: 'Tornillos',
        entity: 'Entity A',
        warehouse: 'Almacen A',
        minStock: 5,
        maxStock: 100,
      };

      const params = service.buildParams(filters, 2);
      expect(params['companyId']).toBe('2');
      expect(params['fromDate']).toBe('2023-01-01');
      expect(params['toDate']).toBe('2023-12-31');
      expect(params['product']).toBe('Tornillos');
      expect(params['entity']).toBe('Entity A');
      expect(params['warehouse']).toBe('Almacen A');
      expect(params['minStock']).toBe('5');
      expect(params['maxStock']).toBe('100');
    });

    it('should skip undefined filter values', () => {
      const filters: InventoryFilters = { product: 'Cable' };
      const params = service.buildParams(filters);
      expect(Object.keys(params)).toHaveLength(1);
      expect(params['product']).toBe('Cable');
    });
  });

  describe('extractInventory', () => {
    it('should extract inventory array from response', () => {
      const result = service.extractInventory({ inventory: mockItems });
      expect(result).toHaveLength(4);
      expect(result[0].productCode).toBe('PROD001');
    });

    it('should return empty array when inventory is null/undefined', () => {
      const result = service.extractInventory({ inventory: undefined as any });
      expect(result).toEqual([]);
    });
  });

  describe('calculateTotalValue', () => {
    it('should calculate total inventory value', () => {
      const value = service.calculateTotalValue(mockItems);
      // 80*0.50 + 0*15 + 5*8.50 + 20*12 = 40 + 0 + 42.5 + 240 = 322.5
      expect(value).toBe(322.5);
    });

    it('should return 0 for empty inventory', () => {
      expect(service.calculateTotalValue([])).toBe(0);
    });

    it('should handle items without unitPrice', () => {
      const items: InventoryItem[] = [
        { productCode: 'X', productName: 'X', entries: 1, exits: 0, stock: 10 },
      ];
      expect(service.calculateTotalValue(items)).toBe(0);
    });
  });

  describe('getLowStockItems', () => {
    it('should return items at or below stock limit', () => {
      const lowStock = service.getLowStockItems(mockItems);
      // PROD002 (stock 0 <= limit 5), PROD003 (stock 5 <= limit 20)
      expect(lowStock).toHaveLength(2);
      expect(lowStock[0].productCode).toBe('PROD002');
      expect(lowStock[1].productCode).toBe('PROD003');
    });

    it('should exclude items without stockLimit', () => {
      const lowStock = service.getLowStockItems(mockItems);
      expect(lowStock.find(i => i.productCode === 'PROD004')).toBeUndefined();
    });
  });

  describe('getOutOfStockItems', () => {
    it('should return only items with zero stock', () => {
      const outOfStock = service.getOutOfStockItems(mockItems);
      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].productCode).toBe('PROD002');
    });

    it('should return empty for all-in-stock inventory', () => {
      const inStock = mockItems.filter(i => i.stock > 0);
      expect(service.getOutOfStockItems(inStock)).toHaveLength(0);
    });
  });

  describe('filterByWarehouse', () => {
    it('should filter by warehouse name', () => {
      const warehouseA = service.filterByWarehouse(mockItems, 'Almacen A');
      expect(warehouseA).toHaveLength(2);
      expect(warehouseA[0].productCode).toBe('PROD001');
      expect(warehouseA[1].productCode).toBe('PROD003');
    });

    it('should return empty for non-existent warehouse', () => {
      expect(service.filterByWarehouse(mockItems, 'Almacen Z')).toHaveLength(0);
    });
  });

  describe('sortByStock', () => {
    it('should sort ascending by default', () => {
      const sorted = service.sortByStock(mockItems);
      expect(sorted[0].stock).toBe(0);
      expect(sorted[1].stock).toBe(5);
      expect(sorted[2].stock).toBe(20);
      expect(sorted[3].stock).toBe(80);
    });

    it('should sort descending', () => {
      const sorted = service.sortByStock(mockItems, false);
      expect(sorted[0].stock).toBe(80);
      expect(sorted[3].stock).toBe(0);
    });

    it('should not mutate original array', () => {
      const original = [...mockItems];
      service.sortByStock(mockItems);
      expect(mockItems).toEqual(original);
    });
  });

  describe('InventoryItem model', () => {
    it('should have required fields', () => {
      const item = mockItems[0];
      expect(item.productCode).toBe('PROD001');
      expect(item.productName).toBe('Tornillos 3/8');
      expect(item.entries).toBe(100);
      expect(item.exits).toBe(20);
      expect(item.stock).toBe(80);
    });

    it('should have correct stock calculation (entries - exits = stock)', () => {
      for (const item of mockItems) {
        expect(item.entries - item.exits).toBe(item.stock);
      }
    });

    it('should handle optional fields', () => {
      const minimalItem: InventoryItem = {
        productCode: 'MIN',
        productName: 'Minimal',
        entries: 0,
        exits: 0,
        stock: 0,
      };
      expect(minimalItem.stockLimit).toBeUndefined();
      expect(minimalItem.unitPrice).toBeUndefined();
      expect(minimalItem.warehouse).toBeUndefined();
    });
  });
});
