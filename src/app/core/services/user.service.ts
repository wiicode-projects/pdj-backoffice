import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserRole {
  id: string;
  name: string;
}

export interface UserSubscription {
  id: string;
  name: string;
  targetType: string;
}

export interface UserMembership {
  id: string;
  status: string;
  isActive: boolean;
  endingAt: string | null;
  createdAt: string;
  subscription: UserSubscription | null;
}

export interface AdminUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isDeleted: boolean;
  profilPicture: string | null;
  language: string;
  createdAt: string;
  updatedAt: string;
  role: UserRole | null;
  membership: UserMembership | null;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedUsers {
  items: AdminUser[];
  meta: PaginationMeta;
}

export interface UserInvoice {
  id: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED';
  endingAt: string | null;
  createdAt: string;
  membership: { id: string; plan: { billingPeriod: string; price?: number } | null } | null;
}

export interface GamePlay {
  id: string;
  durationSeconds: number;
  completed: boolean;
  pointsEarned: number;
  rewardUnlocked: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  game: { id: string; slug: string; name: string };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly gamesUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedUsers> {
    return this.http.get<PaginatedUsers>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  findOne(id: string): Observable<{ status: number; user: AdminUser }> {
    return this.http.get<{ status: number; user: AdminUser }>(`${this.apiUrl}/${id}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: string, isActive: boolean): Observable<{ status: number; user: AdminUser }> {
    return this.http.patch<{ status: number; user: AdminUser }>(`${this.apiUrl}/${id}/toggle-active`, { isActive });
  }

  findInvoices(userId: string): Observable<{ status: number; invoices: UserInvoice[] }> {
    return this.http.get<{ status: number; invoices: UserInvoice[] }>(`${this.apiUrl}/${userId}/invoices`);
  }

  findGamePlays(userId: string): Observable<{ status: number; plays: GamePlay[]; summary: { totalPlays: number; totalPoints: number } }> {
    return this.http.get<{ status: number; plays: GamePlay[]; summary: { totalPlays: number; totalPoints: number } }>(`${this.gamesUrl}/user/${userId}/plays`);
  }

  updateProfile(userId: string, payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }): Observable<{ status: number; user: AdminUser }> {
    return this.http.patch<{ status: number; user: AdminUser }>(`${this.apiUrl}/${userId}`, payload);
  }

  changePassword(userId: string, password: string, confirmPassword: string): Observable<{ status: number; user: AdminUser }> {
    return this.http.patch<{ status: number; user: AdminUser }>(`${this.apiUrl}/${userId}`, {
      password,
      confirmPassword,
    });
  }
}
