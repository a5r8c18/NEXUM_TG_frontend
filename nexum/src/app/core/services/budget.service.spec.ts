import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// BudgetService - Unit Tests (Vitest, pure logic, no Angular DI)
// Tests cover: Budget model, budget line calculations, execution
// tracking, and data transformations.
// ============================================================

export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';

export interface Budget {
  id: string;
  companyId: number;
  name: string;
  description: string | null;
  year: number;
  status: BudgetStatus;
  totalAmount: number;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  accountCode: string;
  accountName: string;
  month: number | null;
  plannedAmount: number;
  actualAmount: number;
  deviation: number;
  notes: string | null;
  createdAt: string;
}

export interface BudgetExecution {
  budgetId: string;
  budgetName: string;
  year: number;
  totalPlanned: number;
  totalActual: number;
  totalDeviation: number;
  lines: BudgetLine[];
}

// Simulated BudgetService logic
class BudgetServiceLogic {
  private apiUrl: string;

  constructor(baseApiUrl: string) {
    this.apiUrl = `${baseApiUrl}/budgets`;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  calculateTotalPlanned(lines: BudgetLine[]): number {
    return lines.reduce((total, line) => total + line.plannedAmount, 0);
  }

  calculateTotalActual(lines: BudgetLine[]): number {
    return lines.reduce((total, line) => total + line.actualAmount, 0);
  }

  calculateDeviation(planned: number, actual: number): number {
    return actual - planned;
  }

  calculateExecutionPercentage(planned: number, actual: number): number {
    if (planned === 0) return 0;
    return (actual / planned) * 100;
  }

  getBudgetExecution(budget: Budget, lines: BudgetLine[]): BudgetExecution {
    const totalPlanned = this.calculateTotalPlanned(lines);
    const totalActual = this.calculateTotalActual(lines);
    const totalDeviation = this.calculateDeviation(totalPlanned, totalActual);

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      year: budget.year,
      totalPlanned,
      totalActual,
      totalDeviation,
      lines,
    };
  }

  filterByMonth(lines: BudgetLine[], month: number): BudgetLine[] {
    return lines.filter(line => line.month === month);
  }

  getOverBudgetLines(lines: BudgetLine[]): BudgetLine[] {
    return lines.filter(line => line.deviation > 0);
  }

  getUnderBudgetLines(lines: BudgetLine[]): BudgetLine[] {
    return lines.filter(line => line.deviation < 0);
  }
}

const mockBudget: Budget = {
  id: 'budget-1',
  companyId: 1,
  name: 'Presupuesto 2026',
  description: 'Presupuesto anual de operaciones',
  year: 2026,
  status: 'approved',
  totalAmount: 100000,
  approvedBy: 'admin@nexum.cu',
  approvedAt: '2026-01-01T00:00:00Z',
  createdAt: '2025-12-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockBudgetLines: BudgetLine[] = [
  {
    id: 'line-1',
    budgetId: 'budget-1',
    accountCode: '135',
    accountName: 'Caja',
    month: 1,
    plannedAmount: 10000,
    actualAmount: 8500,
    deviation: -1500,
    notes: null,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'line-2',
    budgetId: 'budget-1',
    accountCode: '189',
    accountName: 'Mercancías',
    month: 1,
    plannedAmount: 50000,
    actualAmount: 55000,
    deviation: 5000,
    notes: 'Compra adicional',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'line-3',
    budgetId: 'budget-1',
    accountCode: '900',
    accountName: 'Ventas',
    month: 1,
    plannedAmount: 40000,
    actualAmount: 40000,
    deviation: 0,
    notes: null,
    createdAt: '2026-01-15T00:00:00Z',
  },
];

describe('BudgetService', () => {
  let service: BudgetServiceLogic;
  const BASE_URL = 'http://localhost:3001';

  beforeEach(() => {
    service = new BudgetServiceLogic(BASE_URL);
  });

  it('should build correct API URL', () => {
    expect(service.getApiUrl()).toBe('http://localhost:3001/budgets');
  });

  describe('calculateTotalPlanned', () => {
    it('should sum all planned amounts', () => {
      const total = service.calculateTotalPlanned(mockBudgetLines);
      expect(total).toBe(100000);
    });

    it('should return 0 for empty lines', () => {
      expect(service.calculateTotalPlanned([])).toBe(0);
    });
  });

  describe('calculateTotalActual', () => {
    it('should sum all actual amounts', () => {
      const total = service.calculateTotalActual(mockBudgetLines);
      expect(total).toBe(103500);
    });

    it('should return 0 for empty lines', () => {
      expect(service.calculateTotalActual([])).toBe(0);
    });
  });

  describe('calculateDeviation', () => {
    it('should calculate deviation (actual - planned)', () => {
      expect(service.calculateDeviation(10000, 8500)).toBe(-1500);
      expect(service.calculateDeviation(50000, 55000)).toBe(5000);
    });

    it('should return 0 when equal', () => {
      expect(service.calculateDeviation(100, 100)).toBe(0);
    });
  });

  describe('calculateExecutionPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(service.calculateExecutionPercentage(100, 85)).toBe(85);
      expect(service.calculateExecutionPercentage(100, 110)).toBe(110);
    });

    it('should return 0 when planned is 0', () => {
      expect(service.calculateExecutionPercentage(0, 100)).toBe(0);
    });
  });

  describe('getBudgetExecution', () => {
    it('should return complete execution data', () => {
      const execution = service.getBudgetExecution(mockBudget, mockBudgetLines);
      expect(execution.budgetId).toBe('budget-1');
      expect(execution.budgetName).toBe('Presupuesto 2026');
      expect(execution.totalPlanned).toBe(100000);
      expect(execution.totalActual).toBe(103500);
      expect(execution.totalDeviation).toBe(3500);
      expect(execution.lines).toHaveLength(3);
    });
  });

  describe('filterByMonth', () => {
    it('should filter lines by month', () => {
      const januaryLines = service.filterByMonth(mockBudgetLines, 1);
      expect(januaryLines).toHaveLength(3);
    });

    it('should return empty for non-existent month', () => {
      const februaryLines = service.filterByMonth(mockBudgetLines, 2);
      expect(februaryLines).toHaveLength(0);
    });
  });

  describe('getOverBudgetLines', () => {
    it('should return lines with positive deviation', () => {
      const overBudget = service.getOverBudgetLines(mockBudgetLines);
      expect(overBudget).toHaveLength(1);
      expect(overBudget[0].accountCode).toBe('189');
    });
  });

  describe('getUnderBudgetLines', () => {
    it('should return lines with negative deviation', () => {
      const underBudget = service.getUnderBudgetLines(mockBudgetLines);
      expect(underBudget).toHaveLength(1);
      expect(underBudget[0].accountCode).toBe('135');
    });
  });

  describe('Budget model', () => {
    it('should have required fields', () => {
      expect(mockBudget.id).toBe('budget-1');
      expect(mockBudget.name).toBe('Presupuesto 2026');
      expect(mockBudget.year).toBe(2026);
      expect(mockBudget.status).toBe('approved');
    });

    it('should handle optional fields', () => {
      const minimalBudget: Budget = {
        id: 'budget-2',
        companyId: 1,
        name: 'Minimal',
        description: null,
        year: 2026,
        status: 'draft',
        totalAmount: 0,
        approvedBy: null,
        approvedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      expect(minimalBudget.description).toBeNull();
      expect(minimalBudget.approvedBy).toBeNull();
    });
  });

  describe('BudgetLine model', () => {
    it('should have required fields', () => {
      const line = mockBudgetLines[0];
      expect(line.id).toBe('line-1');
      expect(line.accountCode).toBe('135');
      expect(line.plannedAmount).toBe(10000);
      expect(line.actualAmount).toBe(8500);
    });

    it('should handle optional month', () => {
      const annualLine: BudgetLine = {
        id: 'line-4',
        budgetId: 'budget-1',
        accountCode: '999',
        accountName: 'Otros',
        month: null,
        plannedAmount: 1000,
        actualAmount: 1000,
        deviation: 0,
        notes: null,
        createdAt: '2026-01-01T00:00:00Z',
      };
      expect(annualLine.month).toBeNull();
    });
  });
};
