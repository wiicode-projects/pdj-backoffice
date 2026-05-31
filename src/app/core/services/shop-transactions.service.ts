import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FritesTransactionType =
  'PACK_PURCHASE' | 'ITEM_PURCHASE' | 'EVENT_REWARD' |
  'LOGIN_BONUS' | 'MINIGAME_WIN' | 'ADMIN_ADJUST' | 'PROMO';

export interface FritesTransaction {
  id: string;
  type: FritesTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  adminId: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class ShopTransactionsService {
  private readonly base = `${environment.apiUrl}/shop`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 30, type = '', userId = ''): Observable<{ status: number; transactions: FritesTransaction[]; total: number }> {
    const params: Record<string, string | number> = { page, limit };
    if (type)   params['type']   = type;
    if (userId) params['userId'] = userId;
    return this.http.get<any>(`${this.base}/transactions`, { params });
  }
}
