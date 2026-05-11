import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FritesPack {
  id: string;
  name: string;
  description: string | null;
  fritesAmount: number;
  priceCentimes: number;
  badgeLabel: string | null;
  imagePath: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Number of PACK_PURCHASE transactions referencing this pack */
  purchaseCount: number;
}

@Injectable({ providedIn: 'root' })
export class FritesPackService {
  private readonly url = `${environment.apiUrl}/shop/packs`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; packs: FritesPack[] }> {
    return this.http.get<{ status: number; packs: FritesPack[] }>(this.url);
  }

  create(form: FormData): Observable<{ status: number; pack: FritesPack }> {
    return this.http.post<{ status: number; pack: FritesPack }>(this.url, form);
  }

  update(id: string, form: FormData): Observable<{ status: number; pack: FritesPack }> {
    return this.http.patch<{ status: number; pack: FritesPack }>(`${this.url}/${id}`, form);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.url}/${id}`);
  }

  /** Utility: format centimes → CHF string e.g. 800 → "8.00 CHF" */
  static formatPrice(centimes: number): string {
    return (centimes / 100).toFixed(2) + ' CHF';
  }
}
