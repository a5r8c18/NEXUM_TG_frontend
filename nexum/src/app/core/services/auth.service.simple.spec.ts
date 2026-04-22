import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

// Simple mock service for testing
class SimpleAuthService {
  private isAuthenticated = false;
  private currentUser: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post('http://localhost:3001/auth/login', { email, password });
  }

  logout() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

describe('SimpleAuthService', () => {
  let service: SimpleAuthService;
  let httpMock: HttpTestingController;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SimpleAuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(SimpleAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully with valid credentials', () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      accessToken: 'test-token',
      refreshToken: 'refresh-token'
    };

    service.login('test@example.com', 'password123').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:3001/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      password: 'password123'
    });
    req.flush(mockResponse);
  });

  it('should logout and navigate to login', () => {
    service.logout();
    
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should handle login error', () => {
    const errorResponse = { status: 401, statusText: 'Unauthorized' };

    service.login('test@example.com', 'wrong-password').subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('http://localhost:3001/auth/login');
    req.flush('Unauthorized', errorResponse);
  });
});
