import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentGatewaySlug = 'mypos' | 'paypal' | 'bank_transfer';
export type CheckoutMode = 'form_post' | 'redirect' | 'bank_transfer';

export interface QrBillData {
  payload: string;
  svg: string;
  amount: number;
  reference: string;
  iban: string;
  bic: string;
  creditor: {
    name: string;
    street: string;
    zip: string;
    city: string;
    country: string;
  };
  instructions: string;
  bankName: string;
}

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

export interface PaymentMethodInfo {
  slug: PaymentGatewaySlug;
  label: string;
  description: string;
  checkoutMode: CheckoutMode;
  available: boolean;
}

export interface CheckoutResponse {
  status: number;
  payment: PaymentRecord;
  checkoutUrl: string;
  fields: Record<string, string>;
  checkoutMode: CheckoutMode;
  returnToken: string;
  qrBill?: QrBillData;
}

export interface BankTransferInstructionsResponse {
  status: number;
  payment: PaymentRecord;
  qrBill: QrBillData;
  bankConfig: {
    bankName: string;
    accountHolder: string;
    iban: string;
    bic: string;
  };
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
  paypal: {
    enabled: boolean;
    configured: boolean;
    mode: 'test' | 'production' | string;
  };
  bankTransfer: {
    enabled: boolean;
    configured: boolean;
    mode: string;
  };
  methods: PaymentMethodInfo[];
}

export interface RestaurantCheckoutPayload {
  subscriptionId: string;
  subscriptionPlanId: string;
  restaurantId: string;
  gateway: PaymentGatewaySlug;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly url = `${environment.apiUrl}/payments`;

  constructor(private readonly http: HttpClient) {}

  createRestaurantCheckout(payload: RestaurantCheckoutPayload): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.url}/checkout`, {
      purpose: 'restaurant_subscription',
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
    return this.http.get<PaymentStatusResponse>(`${this.url}/return-status`, {
      params: { paymentId, token },
    });
  }

  getBankTransferInstructions(paymentId: string, token?: string): Observable<BankTransferInstructionsResponse> {
    const params: Record<string, string> = {};
    if (token) params['token'] = token;
    return this.http.get<BankTransferInstructionsResponse>(`${this.url}/bank-transfer/${paymentId}`, { params });
  }

  getPendingBankTransfers(): Observable<{ status: number; payments: PaymentRecord[] }> {
    return this.http.get<{ status: number; payments: PaymentRecord[] }>(`${this.url}/bank-transfer/pending`);
  }

  confirmPayment(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.patch<PaymentStatusResponse>(`${this.url}/${paymentId}/confirm`, {});
  }

  cancelPayment(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.patch<PaymentStatusResponse>(`${this.url}/${paymentId}/cancel`, {});
  }
}
