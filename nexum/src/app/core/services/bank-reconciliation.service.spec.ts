import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// BankReconciliationService - Unit Tests (Vitest, pure logic)
// Tests cover: BankReconciliation model, reconciliation calculations,
// balance adjustments, and data transformations.
// ============================================================

export type ReconciliationStatus = 'draft' | 'completed';

export interface BankReconciliation {
  id: string;
  companyId: number;
  bankAccountId: string;
  bankAccount?: any;
  reconciliationDate: string;
  statementBalance: number;
  bookBalance: number;
  adjustedStatementBalance: number;
  adjustedBookBalance: number;
  difference: number;
  status: ReconciliationStatus;
  depositsInTransit: number;
  outstandingChecks: number;
  bankCharges: number;
  interestEarned: number;
  notes: string | null;
  reconciledBy: string | null;
  createdAt: string;
}

// Simulated BankReconciliationService logic
class BankReconciliationServiceLogic {
  private apiUrl: string;

  constructor(baseApiUrl: string) {
    this.apiUrl = `${baseApiUrl}/finance/reconciliations`;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  calculateAdjustedStatementBalance(
    statementBalance: number,
    depositsInTransit: number,
    outstandingChecks: number,
  ): number {
    return statementBalance + depositsInTransit - outstandingChecks;
  }

  calculateAdjustedBookBalance(
    bookBalance: number,
    bankCharges: number,
    interestEarned: number,
  ): number {
    return bookBalance - bankCharges + interestEarned;
  }

  calculateDifference(adjustedStatement: number, adjustedBook: number): number {
    return adjustedBook - adjustedStatement;
  }

  isReconciled(difference: number, tolerance: number = 0.01): boolean {
    return Math.abs(difference) <= tolerance;
  }

  getReconciliationStatus(difference: number, tolerance: number = 0.01): ReconciliationStatus {
    return this.isReconciled(difference, tolerance) ? 'completed' : 'draft';
  }

  calculateTotalAdjustments(reconciliation: BankReconciliation): number {
    return reconciliation.depositsInTransit +
           reconciliation.outstandingChecks +
           reconciliation.bankCharges +
           reconciliation.interestEarned;
  }
}

const mockReconciliation: BankReconciliation = {
  id: 'rec-1',
  companyId: 1,
  bankAccountId: 'bank-1',
  bankAccount: { id: 'bank-1', accountNumber: '1234567890', bankName: 'Banco Metropolitano' },
  reconciliationDate: '2026-01-31',
  statementBalance: 50000,
  bookBalance: 49500,
  adjustedStatementBalance: 50500,
  adjustedBookBalance: 49500,
  difference: -1000,
  status: 'draft',
  depositsInTransit: 500,
  outstandingChecks: 0,
  bankCharges: 0,
  interestEarned: 0,
  notes: null,
  reconciledBy: null,
  createdAt: '2026-01-31T00:00:00Z',
};

const mockReconciled: BankReconciliation = {
  id: 'rec-2',
  companyId: 1,
  bankAccountId: 'bank-1',
  bankAccount: { id: 'bank-1', accountNumber: '1234567890', bankName: 'Banco Metropolitano' },
  reconciliationDate: '2026-02-28',
  statementBalance: 52000,
  bookBalance: 52000,
  adjustedStatementBalance: 52000,
  adjustedBookBalance: 52000,
  difference: 0,
  status: 'completed',
  depositsInTransit: 0,
  outstandingChecks: 0,
  bankCharges: 50,
  interestEarned: 50,
  notes: 'Conciliación completada',
  reconciledBy: 'admin@nexum.cu',
  createdAt: '2026-02-28T00:00:00Z',
};

describe('BankReconciliationService', () => {
  let service: BankReconciliationServiceLogic;
  const BASE_URL = 'http://localhost:3001';

  beforeEach(() => {
    service = new BankReconciliationServiceLogic(BASE_URL);
  });

  it('should build correct API URL', () => {
    expect(service.getApiUrl()).toBe('http://localhost:3001/finance/reconciliations');
  });

  describe('calculateAdjustedStatementBalance', () => {
    it('should add deposits and subtract outstanding checks', () => {
      const adjusted = service.calculateAdjustedStatementBalance(50000, 500, 0);
      expect(adjusted).toBe(50500);
    });

    it('should handle outstanding checks', () => {
      const adjusted = service.calculateAdjustedStatementBalance(50000, 500, 1000);
      expect(adjusted).toBe(49500);
    });

    it('should return original when no adjustments', () => {
      const adjusted = service.calculateAdjustedStatementBalance(50000, 0, 0);
      expect(adjusted).toBe(50000);
    });
  });

  describe('calculateAdjustedBookBalance', () => {
    it('should subtract bank charges and add interest', () => {
      const adjusted = service.calculateAdjustedBookBalance(49500, 50, 50);
      expect(adjusted).toBe(49500);
    });

    it('should handle only bank charges', () => {
      const adjusted = service.calculateAdjustedBookBalance(50000, 100, 0);
      expect(adjusted).toBe(49900);
    });

    it('should handle only interest earned', () => {
      const adjusted = service.calculateAdjustedBookBalance(50000, 0, 200);
      expect(adjusted).toBe(50200);
    });
  });

  describe('calculateDifference', () => {
    it('should calculate difference (book - statement)', () => {
      const diff = service.calculateDifference(49500, 50500);
      expect(diff).toBe(-1000);
    });

    it('should return 0 when balances match', () => {
      const diff = service.calculateDifference(50000, 50000);
      expect(diff).toBe(0);
    });
  });

  describe('isReconciled', () => {
    it('should return true when difference is within tolerance', () => {
      expect(service.isReconciled(0)).toBe(true);
      expect(service.isReconciled(0.005)).toBe(true);
      expect(service.isReconciled(-0.005)).toBe(true);
    });

    it('should return false when difference exceeds tolerance', () => {
      expect(service.isReconciled(1)).toBe(false);
      expect(service.isReconciled(-1)).toBe(false);
    });

    it('should use custom tolerance', () => {
      expect(service.isReconciled(0.5, 1)).toBe(true);
      expect(service.isReconciled(1.5, 1)).toBe(false);
    });
  });

  describe('getReconciliationStatus', () => {
    it('should return completed when reconciled', () => {
      expect(service.getReconciliationStatus(0)).toBe('completed');
      expect(service.getReconciliationStatus(0.005)).toBe('completed');
    });

    it('should return draft when not reconciled', () => {
      expect(service.getReconciliationStatus(100)).toBe('draft');
      expect(service.getReconciliationStatus(-100)).toBe('draft');
    });
  });

  describe('calculateTotalAdjustments', () => {
    it('should sum all adjustment amounts', () => {
      const total = service.calculateTotalAdjustments(mockReconciled);
      expect(total).toBe(150);
    });

    it('should return 0 when no adjustments', () => {
      const noAdjustments: BankReconciliation = {
        ...mockReconciliation,
        depositsInTransit: 0,
        outstandingChecks: 0,
        bankCharges: 0,
        interestEarned: 0,
      };
      expect(service.calculateTotalAdjustments(noAdjustments)).toBe(0);
    });
  });

  describe('BankReconciliation model', () => {
    it('should have required fields', () => {
      expect(mockReconciliation.id).toBe('rec-1');
      expect(mockReconciliation.bankAccountId).toBe('bank-1');
      expect(mockReconciliation.reconciliationDate).toBe('2026-01-31');
      expect(mockReconciliation.statementBalance).toBe(50000);
      expect(mockReconciliation.bookBalance).toBe(49500);
    });

    it('should handle optional fields', () => {
      const minimalReconciliation: BankReconciliation = {
        id: 'rec-3',
        companyId: 1,
        bankAccountId: 'bank-1',
        reconciliationDate: '2026-03-31',
        statementBalance: 0,
        bookBalance: 0,
        adjustedStatementBalance: 0,
        adjustedBookBalance: 0,
        difference: 0,
        status: 'draft',
        depositsInTransit: 0,
        outstandingChecks: 0,
        bankCharges: 0,
        interestEarned: 0,
        notes: null,
        reconciledBy: null,
        createdAt: '2026-03-31T00:00:00Z',
      };
      expect(minimalReconciliation.notes).toBeNull();
      expect(minimalReconciliation.reconciledBy).toBeNull();
      expect(minimalReconciliation.bankAccount).toBeUndefined();
    });

    it('should handle completed status with reconciledBy', () => {
      expect(mockReconciled.status).toBe('completed');
      expect(mockReconciled.reconciledBy).toBe('admin@nexum.cu');
      expect(mockReconciled.notes).toBe('Conciliación completada');
    });
  });

  describe('Reconciliation workflow', () => {
    it('should complete reconciliation when difference is zero', () => {
      const statementBalance = 50000;
      const bookBalance = 50000;
      const depositsInTransit = 0;
      const outstandingChecks = 0;
      const bankCharges = 0;
      const interestEarned = 0;

      const adjustedStatement = service.calculateAdjustedStatementBalance(
        statementBalance,
        depositsInTransit,
        outstandingChecks,
      );
      const adjustedBook = service.calculateAdjustedBookBalance(
        bookBalance,
        bankCharges,
        interestEarned,
      );
      const difference = service.calculateDifference(adjustedStatement, adjustedBook);
      const status = service.getReconciliationStatus(difference);

      expect(adjustedStatement).toBe(50000);
      expect(adjustedBook).toBe(50000);
      expect(difference).toBe(0);
      expect(status).toBe('completed');
    });

    it('should remain draft when difference exists', () => {
      const statementBalance = 50000;
      const bookBalance = 49500;
      const depositsInTransit = 500;
      const outstandingChecks = 0;
      const bankCharges = 0;
      const interestEarned = 0;

      const adjustedStatement = service.calculateAdjustedStatementBalance(
        statementBalance,
        depositsInTransit,
        outstandingChecks,
      );
      const adjustedBook = service.calculateAdjustedBookBalance(
        bookBalance,
        bankCharges,
        interestEarned,
      );
      const difference = service.calculateDifference(adjustedStatement, adjustedBook);
      const status = service.getReconciliationStatus(difference);

      expect(adjustedStatement).toBe(50500);
      expect(adjustedBook).toBe(49500);
      expect(difference).toBe(-1000);
      expect(status).toBe('draft');
    });
  });
};
