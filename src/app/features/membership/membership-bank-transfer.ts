import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PaymentService, QrBillData } from '../../core/services/payment.service';

const STORAGE_KEY = 'pdj_membership_bank_transfer';

export interface StoredBankTransferPayload {
  paymentId: string;
  returnToken: string;
  qrBill?: QrBillData;
}

@Component({
  selector: 'pdj-membership-bank-transfer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './membership-bank-transfer.html',
  styleUrl: './membership-bank-transfer.scss',
})
export class MembershipBankTransfer implements OnInit {
  paymentId = '';
  returnToken = '';
  qrBill: QrBillData | null = null;
  qrSvg: SafeHtml | null = null;
  loading = true;
  error = '';

  constructor(
    private readonly router: Router,
    private readonly paymentService: PaymentService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.router.navigate(['/app/membership']);
      return;
    }

    try {
      const data = JSON.parse(raw) as StoredBankTransferPayload;
      this.paymentId = data.paymentId;
      this.returnToken = data.returnToken;
      if (data.qrBill) {
        this.applyQrBill(data.qrBill);
        this.loading = false;
        return;
      }
      this.loadInstructions();
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      this.error = 'Instructions invalides';
      this.loading = false;
    }
  }

  private loadInstructions(): void {
    this.paymentService.getBankTransferInstructions(this.paymentId, this.returnToken).subscribe({
      next: (res) => {
        this.applyQrBill(res.qrBill);
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les instructions de virement';
        this.loading = false;
      },
    });
  }

  private applyQrBill(qrBill: QrBillData): void {
    this.qrBill = qrBill;
    this.qrSvg = this.sanitizer.bypassSecurityTrustHtml(qrBill.svg);
  }

  copyReference(): void {
    if (!this.qrBill?.reference) return;
    navigator.clipboard.writeText(this.qrBill.reference);
  }

  goBack(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/app/membership']);
  }
}

export function storeMembershipBankTransfer(payload: StoredBankTransferPayload): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearMembershipBankTransfer(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
