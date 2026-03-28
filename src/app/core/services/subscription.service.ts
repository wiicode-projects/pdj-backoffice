import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum TargetType {
  USER = 'USER',
  RESTAURANT = 'RESTAURANT',
}

export enum SubscriptionFeature {
  NO_ADS = 'NO_ADS',
  PREMIUM_ID_CARD = 'PREMIUM_ID_CARD',
  UNLIMITED_GAMES = 'UNLIMITED_GAMES',
  ADVANCED_FILTERS = 'ADVANCED_FILTERS',
  EXCLUSIVE_OFFERS = 'EXCLUSIVE_OFFERS',
  HIGHLIGHT_IN_SEARCH = 'HIGHLIGHT_IN_SEARCH',
}

export interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  isDeleted: boolean;
  targetType: TargetType;
  features: SubscriptionFeature[] | null;
  maxMenusPerDay: number;
  maxImagesPerDish: number;
  maxProfilePhotos: number;
  maxRestaurants: number;
  accessMenusAndProfils: boolean;
  rechercheAndGeo: boolean;
  miniGames: boolean;
  backOfficeComplet: boolean;
  idCardPremium: boolean;
  parrainageViaCode: boolean;
  participationTirages: boolean;
  plans?: SubscriptionPlan[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  currency: string;
  billingPeriod: string;
  type: string;
  isDeleted: boolean;
  discount: number;
  trialPeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionDto {
  name: string;
  description: string;
  monthlyPrice: number;
  targetType: TargetType;
  features?: SubscriptionFeature[];
  maxMenusPerDay: number;
  maxImagesPerDish: number;
  maxProfilePhotos: number;
  maxRestaurants: number;
  accessMenusAndProfils?: boolean;
  rechercheAndGeo?: boolean;
  miniGames?: boolean;
  backOfficeComplet?: boolean;
  idCardPremium?: boolean;
  parrainageViaCode?: boolean;
  participationTirages?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly apiUrl = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; subscriptions: Subscription[] }> {
    return this.http.get<{ status: number; subscriptions: Subscription[] }>(this.apiUrl);
  }

  findOne(id: string): Observable<{ status: number; subscription: Subscription }> {
    return this.http.get<{ status: number; subscription: Subscription }>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateSubscriptionDto): Observable<{ status: number; subscription: Subscription }> {
    return this.http.post<{ status: number; subscription: Subscription }>(this.apiUrl, dto);
  }

  update(id: string, dto: Partial<CreateSubscriptionDto>): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
