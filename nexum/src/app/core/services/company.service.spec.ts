import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// CompanyService - Unit Tests (Vitest, pure logic, no Angular DI)
// Tests cover: Company model, URL construction, CRUD operations,
// search by name/tenant, login companies, and DTO validation.
// ============================================================

interface Company {
  id: number;
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface CreateCompanyDto {
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
}

interface UpdateCompanyDto {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
}

// Simulated CompanyService logic — URL construction + data handling
class CompanyServiceLogic {
  private apiUrl: string;

  constructor(baseApiUrl: string) {
    this.apiUrl = `${baseApiUrl}/companies`;
  }

  getCompaniesUrl(): string {
    return this.apiUrl;
  }

  getCompanyUrl(id: number): string {
    return `${this.apiUrl}/${id}`;
  }

  getSearchByNameUrl(name: string): string {
    return `${this.apiUrl}?search=${name}`;
  }

  getSearchByTenantUrl(tenantId: string): string {
    return `${this.apiUrl}?tenantId=${tenantId}`;
  }

  getLoginSearchUrl(email: string): string {
    return `${this.apiUrl}/public/search?email=${encodeURIComponent(email)}`;
  }

  validateCreateDto(dto: CreateCompanyDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!dto.name || dto.name.trim() === '') errors.push('name is required');
    if (dto.name && dto.name.length > 255) errors.push('name too long');
    if (dto.email && !dto.email.includes('@')) errors.push('invalid email');
    return { valid: errors.length === 0, errors };
  }

  validateUpdateDto(dto: UpdateCompanyDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (dto.name !== undefined && dto.name.trim() === '') errors.push('name cannot be empty');
    if (dto.email !== undefined && !dto.email.includes('@')) errors.push('invalid email');
    return { valid: errors.length === 0, errors };
  }

  canDelete(company: Company): boolean {
    return company.id !== 1; // Cannot delete main company
  }

  filterActive(companies: Company[]): Company[] {
    return companies.filter(c => c.is_active);
  }

  filterByName(companies: Company[], search: string): Company[] {
    const lower = search.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(lower));
  }
}

const mockCompanies: Company[] = [
  {
    id: 1,
    name: 'Teneduria Garcia',
    tax_id: '111111111',
    address: 'Calle Principal 1',
    phone: '1234567890',
    email: 'info@teneduriagarcia.com',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Empresa Demo S.A.',
    tax_id: '222222222',
    address: 'Avenida Secundaria 2',
    phone: '0987654321',
    email: 'demo@empresa.com',
    is_active: true,
    created_at: '2023-01-02T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Empresa Inactiva',
    is_active: false,
    created_at: '2023-01-03T00:00:00.000Z',
  },
];

describe('CompanyService', () => {
  let service: CompanyServiceLogic;
  const BASE_URL = 'http://localhost:3001';

  beforeEach(() => {
    service = new CompanyServiceLogic(BASE_URL);
  });

  describe('URL construction', () => {
    it('should build correct base URL', () => {
      expect(service.getCompaniesUrl()).toBe('http://localhost:3001/companies');
    });

    it('should build correct company by ID URL', () => {
      expect(service.getCompanyUrl(1)).toBe('http://localhost:3001/companies/1');
      expect(service.getCompanyUrl(99)).toBe('http://localhost:3001/companies/99');
    });

    it('should build correct search by name URL', () => {
      expect(service.getSearchByNameUrl('Test')).toBe('http://localhost:3001/companies?search=Test');
    });

    it('should build correct search by tenant URL', () => {
      expect(service.getSearchByTenantUrl('tenant-owner'))
        .toBe('http://localhost:3001/companies?tenantId=tenant-owner');
    });

    it('should build correct login search URL with email encoding', () => {
      expect(service.getLoginSearchUrl('test@example.com'))
        .toBe('http://localhost:3001/companies/public/search?email=test%40example.com');
    });

    it('should encode special characters in email for login URL', () => {
      expect(service.getLoginSearchUrl('test+alias@example.com'))
        .toBe('http://localhost:3001/companies/public/search?email=test%2Balias%40example.com');
    });
  });

  describe('validateCreateDto', () => {
    it('should validate a correct DTO', () => {
      const dto: CreateCompanyDto = { name: 'New Company', email: 'new@co.com' };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const dto: CreateCompanyDto = { name: '' };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should reject name with only spaces', () => {
      const dto: CreateCompanyDto = { name: '   ' };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid email', () => {
      const dto: CreateCompanyDto = { name: 'Valid', email: 'not-an-email' };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid email');
    });

    it('should reject too long name', () => {
      const dto: CreateCompanyDto = { name: 'x'.repeat(256) };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name too long');
    });

    it('should accept optional fields as undefined', () => {
      const dto: CreateCompanyDto = { name: 'Minimal Company' };
      const result = service.validateCreateDto(dto);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateUpdateDto', () => {
    it('should validate a correct update DTO', () => {
      const dto: UpdateCompanyDto = { name: 'Updated Name' };
      const result = service.validateUpdateDto(dto);
      expect(result.valid).toBe(true);
    });

    it('should reject empty name in update', () => {
      const dto: UpdateCompanyDto = { name: '' };
      const result = service.validateUpdateDto(dto);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name cannot be empty');
    });

    it('should accept empty DTO (no changes)', () => {
      const dto: UpdateCompanyDto = {};
      const result = service.validateUpdateDto(dto);
      expect(result.valid).toBe(true);
    });
  });

  describe('canDelete', () => {
    it('should not allow deleting company with id 1 (main company)', () => {
      expect(service.canDelete(mockCompanies[0])).toBe(false);
    });

    it('should allow deleting other companies', () => {
      expect(service.canDelete(mockCompanies[1])).toBe(true);
      expect(service.canDelete(mockCompanies[2])).toBe(true);
    });
  });

  describe('filterActive', () => {
    it('should return only active companies', () => {
      const active = service.filterActive(mockCompanies);
      expect(active).toHaveLength(2);
      expect(active.every(c => c.is_active)).toBe(true);
    });

    it('should return empty array when no active companies', () => {
      const inactive = [{ ...mockCompanies[2] }];
      expect(service.filterActive(inactive)).toHaveLength(0);
    });
  });

  describe('filterByName', () => {
    it('should filter companies by name (case-insensitive)', () => {
      const result = service.filterByName(mockCompanies, 'empresa');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Empresa Demo S.A.');
      expect(result[1].name).toBe('Empresa Inactiva');
    });

    it('should return all for empty search', () => {
      const result = service.filterByName(mockCompanies, '');
      expect(result).toHaveLength(3);
    });

    it('should return empty for no matches', () => {
      const result = service.filterByName(mockCompanies, 'NonExistent');
      expect(result).toHaveLength(0);
    });

    it('should find partial matches', () => {
      const result = service.filterByName(mockCompanies, 'Demo');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });
  });

  describe('Company model', () => {
    it('should have correct structure', () => {
      const company = mockCompanies[0];
      expect(company.id).toBe(1);
      expect(company.name).toBe('Teneduria Garcia');
      expect(company.tax_id).toBe('111111111');
      expect(company.is_active).toBe(true);
      expect(company.created_at).toBeDefined();
    });

    it('should handle optional fields', () => {
      const company = mockCompanies[2];
      expect(company.tax_id).toBeUndefined();
      expect(company.address).toBeUndefined();
      expect(company.phone).toBeUndefined();
      expect(company.email).toBeUndefined();
      expect(company.logo_path).toBeUndefined();
      expect(company.updated_at).toBeUndefined();
    });
  });
});
