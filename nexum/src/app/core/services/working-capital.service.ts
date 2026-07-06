import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgingBuckets {
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  'over-90': number;
  [key: string]: number;
}

export interface WorkingCapitalReport {
  companyId: number;
  generatedAt: string;
  period: number;
  cxc: {
    totalPending: number;
    totalOverdue: number;
    count: number;
    overdueCount: number;
    averageDaysOutstanding: number;
    agingBuckets: AgingBuckets;
  };
  cxp: {
    totalPending: number;
    totalOverdue: number;
    count: number;
    overdueCount: number;
    averageDaysOutstanding: number;
    agingBuckets: AgingBuckets;
  };
  inventory: {
    totalValue: number;
    slowMovingValue: number;
    fastMovingValue: number;
    averageDaysOfInventory: number;
    totalProducts: number;
    slowMovingCount: number;
  };
  indicators: {
    cashConversionCycle: number;
    daysInventoryOutstanding: number;
    daysSalesOutstanding: number;
    daysPayableOutstanding: number;
    workingCapitalBalance: number;
    liquidityRatio: number;
  };
  cashTension: {
    level: 'low' | 'moderate' | 'high' | 'critical';
    score: number;
    description: string;
  };
  tensionFactors: string[];
  recommendations: string[];
}

@Injectable({ providedIn: 'root' })
export class WorkingCapitalService {
  private apiUrl = `${environment.apiUrl}/working-capital`;

  constructor(private http: HttpClient) {}

  getReport(period = 90): Observable<WorkingCapitalReport> {
    const params = new HttpParams().set('period', period.toString());
    return this.http.get<WorkingCapitalReport>(`${this.apiUrl}/report`, { params });
  }
}
