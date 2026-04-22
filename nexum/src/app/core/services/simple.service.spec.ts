import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Simple service examples for testing
class SimpleCalculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

class SimpleValidator {
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  sanitizeString(input: string): string {
    return input.trim().toLowerCase();
  }
}

describe('SimpleCalculator', () => {
  let calculator: SimpleCalculator;

  beforeEach(() => {
    calculator = new SimpleCalculator();
  });

  it('should add two numbers correctly', () => {
    expect(calculator.add(2, 3)).toBe(5);
    expect(calculator.add(-1, 1)).toBe(0);
    expect(calculator.add(0, 0)).toBe(0);
  });

  it('should subtract two numbers correctly', () => {
    expect(calculator.subtract(5, 3)).toBe(2);
    expect(calculator.subtract(1, 1)).toBe(0);
    expect(calculator.subtract(0, 5)).toBe(-5);
  });

  it('should multiply two numbers correctly', () => {
    expect(calculator.multiply(3, 4)).toBe(12);
    expect(calculator.multiply(-2, 3)).toBe(-6);
    expect(calculator.multiply(0, 5)).toBe(0);
  });

  it('should divide two numbers correctly', () => {
    expect(calculator.divide(10, 2)).toBe(5);
    expect(calculator.divide(9, 3)).toBe(3);
    expect(calculator.divide(-6, 2)).toBe(-3);
  });

  it('should throw error when dividing by zero', () => {
    expect(() => calculator.divide(5, 0)).toThrow('Division by zero');
    expect(() => calculator.divide(0, 0)).toThrow('Division by zero');
  });
});

describe('SimpleValidator', () => {
  let validator: SimpleValidator;

  beforeEach(() => {
    validator = new SimpleValidator();
  });

  it('should validate email addresses correctly', () => {
    expect(validator.isValidEmail('test@example.com')).toBe(true);
    expect(validator.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(validator.isValidEmail('invalid-email')).toBe(false);
    expect(validator.isValidEmail('')).toBe(false);
    expect(validator.isValidEmail('test@')).toBe(false);
    expect(validator.isValidEmail('@domain.com')).toBe(false);
  });

  it('should validate password strength correctly', () => {
    expect(validator.isValidPassword('strongpass123')).toBe(true);
    expect(validator.isValidPassword('12345678')).toBe(true);
    expect(validator.isValidPassword('weak')).toBe(false);
    expect(validator.isValidPassword('')).toBe(false);
    expect(validator.isValidPassword('1234567')).toBe(false);
  });

  it('should sanitize strings correctly', () => {
    expect(validator.sanitizeString('  Hello World  ')).toBe('hello world');
    expect(validator.sanitizeString('TEST')).toBe('test');
    expect(validator.sanitizeString('  Mixed CASE 123  ')).toBe('mixed case 123');
    expect(validator.sanitizeString('')).toBe('');
    expect(validator.sanitizeString('   ')).toBe('');
  });
});

// Mock service example for HTTP operations
class MockHttpService {
  private data: any[] = [];

  constructor() {
    this.data = [
      { id: 1, name: 'Test Item 1', active: true },
      { id: 2, name: 'Test Item 2', active: false },
      { id: 3, name: 'Test Item 3', active: true }
    ];
  }

  async getAll(): Promise<any[]> {
    return Promise.resolve([...this.data]);
  }

  async getById(id: number): Promise<any> {
    const item = this.data.find(item => item.id === id);
    if (!item) {
      throw new Error('Item not found');
    }
    return Promise.resolve(item);
  }

  async create(item: any): Promise<any> {
    const newItem = { ...item, id: this.data.length + 1 };
    this.data.push(newItem);
    return Promise.resolve(newItem);
  }

  async update(id: number, updates: any): Promise<any> {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }
    this.data[index] = { ...this.data[index], ...updates };
    return Promise.resolve(this.data[index]);
  }

  async delete(id: number): Promise<void> {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }
    this.data.splice(index, 1);
    return Promise.resolve();
  }
}

describe('MockHttpService', () => {
  let service: MockHttpService;

  beforeEach(() => {
    service = new MockHttpService();
  });

  it('should get all items', async () => {
    const items = await service.getAll();
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe('Test Item 1');
  });

  it('should get item by ID', async () => {
    const item = await service.getById(1);
    expect(item.name).toBe('Test Item 1');
    expect(item.active).toBe(true);
  });

  it('should throw error when getting non-existent item', async () => {
    await expect(service.getById(999)).rejects.toThrow('Item not found');
  });

  it('should create new item', async () => {
    const newItem = { name: 'New Item', active: false };
    const created = await service.create(newItem);
    
    expect(created.id).toBe(4);
    expect(created.name).toBe('New Item');
    expect(created.active).toBe(false);
  });

  it('should update existing item', async () => {
    const updates = { name: 'Updated Item', active: false };
    const updated = await service.update(1, updates);
    
    expect(updated.id).toBe(1);
    expect(updated.name).toBe('Updated Item');
    expect(updated.active).toBe(false);
  });

  it('should throw error when updating non-existent item', async () => {
    await expect(service.update(999, { name: 'Test' })).rejects.toThrow('Item not found');
  });

  it('should delete item', async () => {
    await service.delete(1);
    
    const items = await service.getAll();
    expect(items).toHaveLength(2);
    expect(items.find(item => item.id === 1)).toBeUndefined();
  });

  it('should throw error when deleting non-existent item', async () => {
    await expect(service.delete(999)).rejects.toThrow('Item not found');
  });
});
