import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dish } from './dish.service';

export interface Menu {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  type: string | null;
  isDeleted: boolean;
  isModele: boolean;
  isFullMenuMandatory?: boolean;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  appetizer: Dish | null;
  mainCourse: Dish | null;
  dessert: Dish | null;
  restaurant: {
    id: string;
    name: string;
  } | null;
}

export interface PaginatedMenus {
  items: Menu[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface MenusByRestaurant {
  status: number;
  menus: Menu[];
}

export interface CreateMenuPayload {
  name: string;
  price: number;
  mainCourseId: string;
  appetizerId?: string;
  dessertId?: string;
  isModele: boolean;
  isFullMenuMandatory?: boolean;
  availableAt: string;
}

export interface MenuResponse {
  status: number;
  menu: Menu;
}

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly apiUrl = `${environment.apiUrl}/menus`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedMenus> {
    return this.http.get<PaginatedMenus>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  findByRestaurant(restaurantId: string): Observable<MenusByRestaurant> {
    return this.http.get<MenusByRestaurant>(`${this.apiUrl}/${restaurantId}/restaurants`);
  }

  findOne(id: string): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateMenuPayload): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: CreateMenuPayload): Observable<MenuResponse> {
    return this.http.patch<MenuResponse>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.apiUrl}/${id}`);
  }
}
