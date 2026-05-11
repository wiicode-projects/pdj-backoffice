import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentInvoice {
  id: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED';
  endingAt: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  membership: {
    id: string;
    plan: { billingPeriod: string } | null;
    subscription: { id: string; name: string } | null;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private readonly apiUrl = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; invoices: PaymentInvoice[] }> {
    return this.http.get<{ status: number; invoices: PaymentInvoice[] }>(`${this.apiUrl}/invoices/all`);
  }
}
