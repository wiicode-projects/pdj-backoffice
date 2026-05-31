import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ShopWalletsService, WalletUser } from '../../core/services/shop-wallets.service';

const TX_TYPE_LABELS: Record<string, string> = {
  PACK_PURCHASE: 'Achat pack', ITEM_PURCHASE: 'Achat article',
  EVENT_REWARD: 'Récompense', LOGIN_BONUS: 'Connexion',
  MINIGAME_WIN: 'Mini-jeu', ADMIN_ADJUST: 'Ajustement', PROMO: 'Promo',
};

@Component({
  selector: 'pdj-shop-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-wallets.html',
  styleUrl: './shop-wallets.scss',
})
export class ShopWallets implements OnInit {
  wallets: WalletUser[] = [];
  total   = 0;
  page    = 1;
  limit   = 20;
  search  = '';
  loading = true;

  // Detail panel
  selectedWallet: WalletUser | null = null;
  walletDetail: any = null;
  loadingDetail = false;

  // Adjust modal
  showAdjust    = false;
  adjustAmount  = 0;
  adjustReason  = '';
  adjustType    = 'ADMIN_ADJUST';
  saving        = false;
  adjustError   = '';

  readonly txTypeLabels = TX_TYPE_LABELS;
  readonly adjustTypes  = ['ADMIN_ADJUST', 'EVENT_REWARD', 'LOGIN_BONUS', 'PROMO'];

  constructor(
    private walletsService: ShopWalletsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.walletsService.findAll(this.page, this.limit, this.search)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: any) => { this.wallets = r.wallets; this.total = r.total; this.cdr.detectChanges(); } });
  }

  onSearch() { this.page = 1; this.load(); }

  get totalPages() { return Math.ceil(this.total / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }

  openDetail(w: WalletUser) {
    this.selectedWallet = w;
    this.walletDetail   = null;
    this.loadingDetail  = true;
    this.walletsService.getWallet(w.id)
      .pipe(finalize(() => { this.loadingDetail = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: any) => { this.walletDetail = r; this.cdr.detectChanges(); } });
  }

  closeDetail() { this.selectedWallet = null; this.walletDetail = null; }

  openAdjust() {
    this.adjustAmount = 0;
    this.adjustReason = '';
    this.adjustType   = 'ADMIN_ADJUST';
    this.adjustError  = '';
    this.showAdjust   = true;
    this.cdr.detectChanges();
  }

  closeAdjust() { this.showAdjust = false; this.cdr.detectChanges(); }

  saveAdjust() {
    if (!this.selectedWallet || !this.adjustReason.trim() || this.adjustAmount === 0) {
      this.adjustError = 'Montant et raison obligatoires.'; return;
    }
    this.saving = true;
    this.walletsService.adjust(this.selectedWallet.id, this.adjustAmount, this.adjustReason, this.adjustType)
      .subscribe({
        next: (r: any) => {
          this.saving = false;
          this.showAdjust = false;
          // Refresh local balance
          if (this.selectedWallet) this.selectedWallet.fritesBalance = r.newBalance;
          const idx = this.wallets.findIndex(w => w.id === this.selectedWallet?.id);
          if (idx >= 0) this.wallets[idx].fritesBalance = r.newBalance;
          this.openDetail(this.selectedWallet!);
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          this.saving      = false;
          this.adjustError = e?.error?.message ?? 'Erreur lors de l\'ajustement.';
          this.cdr.detectChanges();
        },
      });
  }

  getInitials(w: WalletUser) {
    return ((w.firstName?.[0] ?? '') + (w.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  txClass(type: string): string {
    const map: Record<string, string> = {
      PACK_PURCHASE: 'tx--blue', ITEM_PURCHASE: 'tx--purple',
      EVENT_REWARD: 'tx--green', LOGIN_BONUS: 'tx--green',
      MINIGAME_WIN: 'tx--amber', ADMIN_ADJUST: 'tx--red', PROMO: 'tx--amber',
    };
    return map[type] ?? 'tx--gray';
  }
}
