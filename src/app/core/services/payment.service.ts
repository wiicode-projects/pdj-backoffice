import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentRecord {
  id: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentGateway: string;
  purpose: string;
  purposePayload: Record<string, unknown> | null;
  restaurantId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CheckoutResponse {
  status: number;
  payment: PaymentRecord;
  checkoutUrl: string;
  fields: Record<string, string>;
  returnToken: string;
}

export interface PaymentStatusResponse {
  status: number;
  payment: PaymentRecord;
}

export interface PaymentAvailabilityResponse {
  status: number;
  mypos: {
    enabled: boolean;
    configured: boolean;
    mode: 'test' | 'production' | string;
  };
}

export interface RestaurantCheckoutPayload {
  subscriptionId: string;
  subscriptionPlanId: string;
  restaurantId: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly url = `${environment.apiUrl}/payments`;

  constructor(private readonly http: HttpClient) {}

  createRestaurantCheckout(payload: RestaurantCheckoutPayload): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.url}/checkout`, {
      purpose: 'restaurant_subscription',
      gateway: 'mypos',
      returnChannel: 'backoffice',
      ...payload,
    });
  }

  getAvailability(): Observable<PaymentAvailabilityResponse> {
    return this.http.get<PaymentAvailabilityResponse>(`${this.url}/availability`);
  }

  getStatus(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.url}/${paymentId}/status`);
  }

  getReturnStatus(paymentId: string, token: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.url}/mypos/return-status`, {
      params: { paymentId, token },
    });
  }
}
