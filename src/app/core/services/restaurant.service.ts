import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginationMeta } from './user.service';

export interface RestaurantMembership {
  id: string;
  status: string;
  isActive: boolean;
  endingAt: string | null;
  subscription: { id: string; name: string; targetType: string; maxProfilePhotos?: number | null } | null;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  type: 'FIXED' | 'ITINERANT';
  imagePath: string | null;
  viewCount: number;
  clickCount: number;
  reservationEnabled: boolean;
  bookingMethod: 'PHONE' | 'EMAIL' | null;
  bookingContact: string | null;
  isDeleted: boolean;
  isActive: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  membership: RestaurantMembership | null;
  branches: AdminRestaurant[];
  users: { id: string; firstName: string; lastName: string; email: string }[] | null;
  images: { id: string; path: string }[] | null;
}

export interface PaginatedRestaurants {
  items: AdminRestaurant[];
  meta: PaginationMeta;
}

export interface Invoice {
  id: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED';
  endingAt: string | null;
  createdAt: string;
  membership: { id: string; plan: { billingPeriod: string } | null } | null;
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedRestaurants> {
    return this.http.get<PaginatedRestaurants>(`${this.apiUrl}?page=${page}&limit=${limit}&includeInactive=true`);
  }

  findOne(id: string): Observable<{ status: number; restaurant: AdminRestaurant }> {
    return this.http.get<{ status: number; restaurant: AdminRestaurant }>(`${this.apiUrl}/${id}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteImage(restaurantId: string, imageId: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.apiUrl}/${restaurantId}/images/${imageId}`);
  }

  toggleActive(id: string, isActive: boolean): Observable<{ status: number; restaurant: AdminRestaurant }> {
    return this.http.patch<{ status: number; restaurant: AdminRestaurant }>(`${this.apiUrl}/${id}/toggle-active`, { isActive });
  }

  findInvoices(restaurantId: string): Observable<{ status: number; invoices: Invoice[] }> {
    return this.http.get<{ status: number; invoices: Invoice[] }>(`${this.apiUrl}/${restaurantId}/invoices`);
  }

  update(id: string, formData: FormData): Observable<{ status: number; restaurant: AdminRestaurant }> {
    return this.http.patch<{ status: number; restaurant: AdminRestaurant }>(`${this.apiUrl}/${id}`, formData);
  }

  create(formData: FormData): Observable<{ status: number; restaurant: AdminRestaurant }> {
    return this.http.post<{ status: number; restaurant: AdminRestaurant }>(this.apiUrl, formData);
  }
}
