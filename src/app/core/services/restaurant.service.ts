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
  subscription: { id: string; name: string; targetType: string } | null;
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
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  membership: RestaurantMembership | null;
  branches: AdminRestaurant[];
  users: { id: string; firstName: string; lastName: string; email: string }[] | null;
}

export interface PaginatedRestaurants {
  items: AdminRestaurant[];
  meta: PaginationMeta;
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedRestaurants> {
    return this.http.get<PaginatedRestaurants>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  findOne(id: string): Observable<{ status: number; restaurant: AdminRestaurant }> {
    return this.http.get<{ status: number; restaurant: AdminRestaurant }>(`${this.apiUrl}/${id}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
