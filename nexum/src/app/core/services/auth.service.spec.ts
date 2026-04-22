import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// AuthService - Unit Tests (Vitest, pure logic, no Angular DI)
// Tests cover: NexumUser interface, role checking, token
// management, session handling, and multi-company detection.
// ============================================================

interface NexumUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'user' | 'facturador';
  tenantId: string;
  tenantName: string;
  tenantType: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  avatarUrl?: string;
  currentCompanyId?: number;
  companyId?: number;
  companies?: any[];
}

// Simulated AuthService logic extracted for testing
class AuthServiceLogic {
  private _isAuthenticated = false;
  private _currentUser: NexumUser | null = null;
  private _currentCompanyId = 1;
  private _token: string | null = null;

  get isAuthenticated(): boolean { return this._isAuthenticated; }
  get currentUser(): NexumUser | null { return this._currentUser; }
  get currentCompanyId(): number { return this._currentCompanyId; }

  setSession(user: NexumUser, token: string): void {
    this._currentUser = user;
    this._isAuthenticated = true;
    this._token = token;
  }

  logout(): void {
    this._currentUser = null;
    this._isAuthenticated = false;
    this._token = null;
  }

  getToken(): string | null {
    return this._token;
  }

  hasRole(role: string): boolean {
    return this._currentUser?.role === role;
  }

  isSuperadmin(): boolean {
    return this._currentUser?.role === 'superadmin';
  }

  isAdmin(): boolean {
    const role = this._currentUser?.role;
    return role === 'admin' || role === 'superadmin';
  }

  isMultiCompany(): boolean {
    return this._currentUser?.tenantType === 'MULTI_COMPANY' || false;
  }

  isSingleCompany(): boolean {
    return this._currentUser?.tenantType === 'SINGLE_COMPANY';
  }

  getFullName(): string {
    const user = this._currentUser;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  setCurrentCompanyId(companyId: number): void {
    this._currentCompanyId = companyId;
    if (this._currentUser) {
      this._currentUser.currentCompanyId = companyId;
    }
  }

  getCurrentCompanyId(): number {
    return this._currentUser?.currentCompanyId || this._currentCompanyId;
  }

  getUserHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    const user = this._currentUser;
    if (user) {
      headers['X-User-ID'] = user.id;
      headers['X-User-Email'] = user.email;
      headers['X-User-Role'] = user.role;
      if (user.companyId) {
        headers['X-Company-ID'] = user.companyId.toString();
      }
    }
    return headers;
  }

  getCurrentUserTenant(): { type: string; name: string; id: string } | null {
    const user = this._currentUser;
    if (!user) return null;
    return { type: user.tenantType, name: user.tenantName, id: user.tenantId };
  }

  processLoginResponse(response: { user: any; accessToken: string }): boolean {
    if (response && response.accessToken) {
      const user: NexumUser = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        role: response.user.role || 'admin',
        tenantId: response.user.tenantId || 'tenant-1',
        tenantName: response.user.tenantName || 'Empresa Demo',
        tenantType: response.user.tenantType || 'MULTI_COMPANY',
      };
      this.setSession(user, response.accessToken);
      return true;
    }
    return false;
  }
}

const mockUser: NexumUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  tenantId: 'tenant-single_company-1234567890',
  tenantName: 'Test Company',
  tenantType: 'SINGLE_COMPANY',
  currentCompanyId: 1,
  companyId: 1,
  companies: [],
};

const mockSuperadmin: NexumUser = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  email: 'admin@teneduriagarcia.com',
  firstName: 'Admin',
  lastName: 'TG',
  role: 'superadmin',
  tenantId: 'tenant-owner',
  tenantName: 'Teneduria Garcia',
  tenantType: 'MULTI_COMPANY',
  companyId: 1,
};

describe('AuthService', () => {
  let service: AuthServiceLogic;

  beforeEach(() => {
    service = new AuthServiceLogic();
  });

  it('should initialize with unauthenticated state', () => {
    expect(service.isAuthenticated).toBe(false);
    expect(service.currentUser).toBeNull();
    expect(service.currentCompanyId).toBe(1);
  });

  describe('setSession / logout', () => {
    it('should set session correctly', () => {
      service.setSession(mockUser, 'test-token-abc');

      expect(service.isAuthenticated).toBe(true);
      expect(service.currentUser).toEqual(mockUser);
      expect(service.getToken()).toBe('test-token-abc');
    });

    it('should logout and clear state', () => {
      service.setSession(mockUser, 'test-token');
      service.logout();

      expect(service.isAuthenticated).toBe(false);
      expect(service.currentUser).toBeNull();
      expect(service.getToken()).toBeNull();
    });
  });

  describe('processLoginResponse', () => {
    it('should process valid login response', () => {
      const response = {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: 'admin',
          tenantId: mockUser.tenantId,
          tenantName: mockUser.tenantName,
          tenantType: 'SINGLE_COMPANY',
        },
        accessToken: 'jwt-token-123',
      };

      const result = service.processLoginResponse(response);

      expect(result).toBe(true);
      expect(service.isAuthenticated).toBe(true);
      expect(service.currentUser?.email).toBe('test@example.com');
      expect(service.currentUser?.role).toBe('admin');
      expect(service.getToken()).toBe('jwt-token-123');
    });

    it('should return false for response without accessToken', () => {
      const result = service.processLoginResponse({ user: {}, accessToken: '' });
      expect(result).toBe(false);
      expect(service.isAuthenticated).toBe(false);
    });

    it('should use defaults when response user lacks fields', () => {
      const response = {
        user: { id: '1', email: 'x@y.com', firstName: 'A', lastName: 'B' },
        accessToken: 'token',
      };

      service.processLoginResponse(response);

      expect(service.currentUser?.role).toBe('admin');
      expect(service.currentUser?.tenantType).toBe('MULTI_COMPANY');
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      service.setSession(mockUser, 'token');
      expect(service.hasRole('admin')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      service.setSession(mockUser, 'token');
      expect(service.hasRole('superadmin')).toBe(false);
    });

    it('should return false when unauthenticated', () => {
      expect(service.hasRole('admin')).toBe(false);
    });
  });

  describe('role checks', () => {
    it('isSuperadmin should return true for superadmin', () => {
      service.setSession(mockSuperadmin, 'token');
      expect(service.isSuperadmin()).toBe(true);
    });

    it('isSuperadmin should return false for admin', () => {
      service.setSession(mockUser, 'token');
      expect(service.isSuperadmin()).toBe(false);
    });

    it('isAdmin should return true for admin', () => {
      service.setSession(mockUser, 'token');
      expect(service.isAdmin()).toBe(true);
    });

    it('isAdmin should return true for superadmin', () => {
      service.setSession(mockSuperadmin, 'token');
      expect(service.isAdmin()).toBe(true);
    });

    it('isAdmin should return false for user role', () => {
      const normalUser = { ...mockUser, role: 'user' as const };
      service.setSession(normalUser, 'token');
      expect(service.isAdmin()).toBe(false);
    });

    it('isAdmin should return false for facturador role', () => {
      const facturador = { ...mockUser, role: 'facturador' as const };
      service.setSession(facturador, 'token');
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('tenant / company', () => {
    it('isMultiCompany should detect MULTI_COMPANY', () => {
      service.setSession(mockSuperadmin, 'token');
      expect(service.isMultiCompany()).toBe(true);
    });

    it('isSingleCompany should detect SINGLE_COMPANY', () => {
      service.setSession(mockUser, 'token');
      expect(service.isSingleCompany()).toBe(true);
    });

    it('isMultiCompany should return false when unauthenticated', () => {
      expect(service.isMultiCompany()).toBe(false);
    });

    it('getCurrentUserTenant should return tenant info', () => {
      service.setSession(mockUser, 'token');
      const tenant = service.getCurrentUserTenant();
      expect(tenant).toEqual({
        type: 'SINGLE_COMPANY',
        name: 'Test Company',
        id: 'tenant-single_company-1234567890',
      });
    });

    it('getCurrentUserTenant should return null when unauthenticated', () => {
      expect(service.getCurrentUserTenant()).toBeNull();
    });
  });

  describe('company ID management', () => {
    it('should set and get current company ID', () => {
      service.setSession(mockUser, 'token');
      service.setCurrentCompanyId(5);
      expect(service.getCurrentCompanyId()).toBe(5);
    });

    it('should update user object when setting company ID', () => {
      service.setSession({ ...mockUser }, 'token');
      service.setCurrentCompanyId(3);
      expect(service.currentUser?.currentCompanyId).toBe(3);
    });

    it('should default to signal value when user has no currentCompanyId', () => {
      const userNoCo = { ...mockUser, currentCompanyId: undefined };
      service.setSession(userNoCo, 'token');
      expect(service.getCurrentCompanyId()).toBe(1);
    });
  });

  describe('getFullName', () => {
    it('should return full name when authenticated', () => {
      service.setSession(mockUser, 'token');
      expect(service.getFullName()).toBe('Test User');
    });

    it('should return empty string when unauthenticated', () => {
      expect(service.getFullName()).toBe('');
    });
  });

  describe('getUserHeaders', () => {
    it('should return headers with user info', () => {
      service.setSession(mockUser, 'token');
      const headers = service.getUserHeaders();
      expect(headers['X-User-ID']).toBe(mockUser.id);
      expect(headers['X-User-Email']).toBe(mockUser.email);
      expect(headers['X-User-Role']).toBe('admin');
      expect(headers['X-Company-ID']).toBe('1');
    });

    it('should return empty headers when unauthenticated', () => {
      const headers = service.getUserHeaders();
      expect(Object.keys(headers)).toHaveLength(0);
    });

    it('should omit X-Company-ID when companyId is undefined', () => {
      const userNoCo = { ...mockUser, companyId: undefined };
      service.setSession(userNoCo, 'token');
      const headers = service.getUserHeaders();
      expect(headers['X-Company-ID']).toBeUndefined();
    });
  });
});
