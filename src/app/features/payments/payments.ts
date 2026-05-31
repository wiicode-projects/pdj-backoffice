import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { InvoiceService, PaymentInvoice } from '../../core/services/invoice.service';

@Component({
  selector: 'pdj-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments implements OnInit {
  invoices: PaymentInvoice[] = [];
  filteredInvoices: PaymentInvoice[] = [];
  loading = true;
  searchTerm = '';
  statusFilter = '';

  // KPIs
  totalInvoices = 0;
  totalPaid = 0;
  totalPending = 0;
  totalCancelled = 0;

  constructor(
    private invoiceService: InvoiceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoiceService.findAll()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          this.invoices = result.invoices ?? [];
          this.computeKPIs();
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load invoices:', err);
        },
      });
  }

  private computeKPIs(): void {
    this.totalInvoices = this.invoices.length;
    this.totalPaid = this.invoices.filter(i => i.status === 'PAID').length;
    this.totalPending = this.invoices.filter(i => i.status === 'PENDING').length;
    this.totalCancelled = this.invoices.filter(i => i.status === 'CANCELLED' || i.status === 'REFUNDED').length;
  }

  applyFilters(): void {
    let result = [...this.invoices];
    if (this.statusFilter) {
      result = result.filter(i => i.status === this.statusFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i =>
        (i.restaurant?.name ?? '').toLowerCase().includes(term) ||
        (i.user?.firstName ?? '').toLowerCase().includes(term) ||
        (i.user?.lastName ?? '').toLowerCase().includes(term) ||
        (i.user?.email ?? '').toLowerCase().includes(term) ||
        (i.membership?.subscription?.name ?? '').toLowerCase().includes(term)
      );
    }
    this.filteredInvoices = result;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  getOwnerLabel(inv: PaymentInvoice): string {
    if (inv.restaurant) return inv.restaurant.name;
    if (inv.user) return `${inv.user.firstName ?? ''} ${inv.user.lastName ?? ''}`.trim() || inv.user.email;
    return '—';
  }

  getOwnerType(inv: PaymentInvoice): 'restaurant' | 'user' | 'none' {
    if (inv.restaurant) return 'restaurant';
    if (inv.user) return 'user';
    return 'none';
  }
}
