import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BaseApiService {
  constructor(
    protected http: HttpClient,
    private authService: AuthService
  ) {}

  protected getWithCompanyId(url: string, params?: HttpParams): Observable<any> {
    if (!params) params = new HttpParams();
    
    const companyId = this.authService.getCurrentCompanyId();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    
    return this.http.get(url, { params });
  }

  protected postWithCompanyId(url: string, data?: any): Observable<any> {
    const companyId = this.authService.getCurrentCompanyId();
    if (companyId) {
      data = { ...data, companyId };
    }
    return this.http.post(url, data);
  }

  protected putWithCompanyId(url: string, data?: any): Observable<any> {
    const companyId = this.authService.getCurrentCompanyId();
    if (companyId) {
      data = { ...data, companyId };
    }
    return this.http.put(url, data);
  }

  protected deleteWithCompanyId(url: string): Observable<any> {
    let params = new HttpParams();
    const companyId = this.authService.getCurrentCompanyId();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    return this.http.delete(url, { params });
  }
}
