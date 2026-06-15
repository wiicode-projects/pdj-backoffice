import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type GiftType = 'CAFE' | 'DESSERT' | 'DIGESTIF' | 'AUTRE';

export interface RestaurantGift {
  id: string;
  isActive: boolean;
  giftType: GiftType;
  description: string | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertGiftPayload {
  giftType: GiftType;
  description?: string;
  label?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantGiftService {
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  getGift(restaurantId: string): Observable<{ status: number; gift: RestaurantGift | null }> {
    return this.http.get<{ status: number; gift: RestaurantGift | null }>(
      `${this.apiUrl}/${restaurantId}/gift`,
    );
  }

  upsertGift(
    restaurantId: string,
    payload: UpsertGiftPayload,
  ): Observable<{ status: number; gift: RestaurantGift }> {
    return this.http.patch<{ status: number; gift: RestaurantGift }>(
      `${this.apiUrl}/${restaurantId}/gift`,
      payload,
    );
  }
}
