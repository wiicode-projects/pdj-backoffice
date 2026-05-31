import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FritesTransactionType } from './shop-transactions.service';

export interface ShopAnalyticsData {
  totalCirculation: number;
  totalEmitted: number;
  totalSpent: number;
  usersWithFrites: number;
  recentTxCount: number;
  byType: { type: FritesTransactionType; count: number; total: number }[];
  topWallets: { id: string; firstName: string; lastName: string; email: string; fritesBalance: number }[];
}

@Injectable({ providedIn: 'root' })
export class ShopAnalyticsService {
  private readonly base = `${environment.apiUrl}/shop`;

  constructor(private http: HttpClient) {}

  getAnalytics(): Observable<{ status: number; analytics: ShopAnalyticsData }> {
    return this.http.get<any>(`${this.base}/analytics`);
  }
}
