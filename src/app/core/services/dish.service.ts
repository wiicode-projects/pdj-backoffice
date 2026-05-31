import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DishGalleryImage {
  id: string;
  path: string;
}

export interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  diet: string | null;
  isAvailable: boolean;
  preparationTime: number | null;
  calories: number | null;
  isDeleted: boolean;
  gallery: DishGalleryImage[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDishes {
  items: Dish[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DishService {
  private readonly apiUrl = `${environment.apiUrl}/dishes`;

  constructor(private http: HttpClient) {}

  findAll(page = 1, limit = 50, restaurantId?: string, search?: string, category?: string): Observable<PaginatedDishes> {
    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (restaurantId) url += `&restaurantId=${restaurantId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return this.http.get<PaginatedDishes>(url);
  }

  findOne(id: string): Observable<{ dish: Dish; status: number }> {
    return this.http.get<{ dish: Dish; status: number }>(`${this.apiUrl}/${id}`);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.apiUrl}/${id}`);
  }

  create(formData: FormData): Observable<{ dish: Dish; status: number }> {
    return this.http.post<{ dish: Dish; status: number }>(this.apiUrl, formData);
  }

  update(id: string, formData: FormData): Observable<{ dish: Dish; status: number }> {
    return this.http.patch<{ dish: Dish; status: number }>(`${this.apiUrl}/${id}`, formData);
  }
}
