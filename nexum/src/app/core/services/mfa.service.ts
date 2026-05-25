import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyResponse {
  success: boolean;
  message: string;
}

export interface MFAStatusResponse {
  isEnabled: boolean;
  setupComplete: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MfaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  setupMFA(): Observable<MFASetupResponse> {
    return this.http.post<MFASetupResponse>(`${this.apiUrl}/auth/mfa/setup`, {});
  }

  verifyMFA(token: string): Observable<MFAVerifyResponse> {
    return this.http.post<MFAVerifyResponse>(`${this.apiUrl}/auth/mfa/verify`, { token });
  }

  disableMFA(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/mfa/disable`, { password });
  }

  getMFAStatus(): Observable<MFAStatusResponse> {
    return this.http.get<MFAStatusResponse>(`${this.apiUrl}/auth/mfa/status`);
  }

  verifyMFAForLogin(userId: string, token: string): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(`${this.apiUrl}/auth/mfa/verify-login`, { userId, token });
  }

  completeLoginWithMFA(userId: string, token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/mfa/complete-login`, { userId, token });
  }
}
