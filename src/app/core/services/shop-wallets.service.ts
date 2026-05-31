import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FritesTransactionType } from './shop-transactions.service';

export interface WalletUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fritesBalance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  isActive: boolean;
  role: { name: string };
}

export interface WalletDetail {
  user: WalletUser;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: FritesTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ShopWalletsService {
  private readonly base = `${environment.apiUrl}/shop`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 20, search = ''): Observable<{ status: number; wallets: WalletUser[]; total: number; page: number }> {
    return this.http.get<any>(`${this.base}/wallets`, { params: { page, limit, search } });
  }

  getWallet(userId: string): Observable<{ status: number; user: WalletUser; transactions: WalletTransaction[] }> {
    return this.http.get<any>(`${this.base}/wallets/${userId}`);
  }

  adjust(userId: string, amount: number, reason: string, type = 'ADMIN_ADJUST'): Observable<{ status: number; newBalance: number }> {
    return this.http.post<any>(`${this.base}/wallets/${userId}/adjust`, { amount, reason, type });
  }
}
