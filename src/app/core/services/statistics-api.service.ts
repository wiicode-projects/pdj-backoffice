import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RevenueSource = 'all' | 'subscriptions' | 'packs';

export interface RevenueKpis {
  revenuePaidCurrentPeriod: number;
  totalRevenuePaid: number;
  revenueForecast: number;
  pendingInvoicesCount: number;
  pendingInvoicesTotal: number;
  totalActiveSubscribers: number;
  // Pack-specific
  packRevenuePeriod: number;
  packRevenueTotal: number;
  packPurchaseCount: number;
  // Subscription-specific
  subRevenuePeriod: number;
  subRevenueTotal: number;
}

export interface SubscriberBreakdown {
  name: string;
  targetType: 'USER' | 'RESTAURANT';
  count: number;
  monthlyRevenue: number;
  color: string;
}

export interface MonthlyComparison {
  month: string;
  paid: number;
  pending: number;
}

export interface YearlyComparison {
  year: number;
  paid: number;
  pending: number;
}

export interface RevenueStatisticsResponse {
  status: number;
  source: RevenueSource;
  kpis: RevenueKpis;
  subscriberBreakdown: SubscriberBreakdown[];
  monthlyComparison: MonthlyComparison[];
  yearlyComparison: YearlyComparison[];
}

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private base = `${environment.apiUrl}/statistics`;

  constructor(private http: HttpClient) {}

  getRevenue(
    period: 'monthly' | 'yearly',
    year: number,
    month?: number,
    source: RevenueSource = 'all',
  ): Observable<RevenueStatisticsResponse> {
    let url = `${this.base}/revenue?period=${period}&year=${year}&source=${source}`;
    if (period === 'monthly' && month) url += `&month=${month}`;
    return this.http.get<RevenueStatisticsResponse>(url);
  }
}
