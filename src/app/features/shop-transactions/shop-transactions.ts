import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ShopTransactionsService, FritesTransaction, FritesTransactionType } from '../../core/services/shop-transactions.service';

const TX_LABELS: Record<string, string> = {
  PACK_PURCHASE: 'Achat pack', ITEM_PURCHASE: 'Achat article',
  EVENT_REWARD: 'Récompense événement', LOGIN_BONUS: 'Bonus connexion',
  MINIGAME_WIN: 'Gain mini-jeu', ADMIN_ADJUST: 'Ajustement admin', PROMO: 'Promotion',
};

@Component({
  selector: 'pdj-shop-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-transactions.html',
  styleUrl: './shop-transactions.scss',
})
export class ShopTransactions implements OnInit {
  transactions: FritesTransaction[] = [];
  total   = 0;
  page    = 1;
  limit   = 30;
  loading = true;

  filterType   = '';
  filterUserId = '';

  readonly types: FritesTransactionType[] = [
    'PACK_PURCHASE', 'ITEM_PURCHASE', 'EVENT_REWARD',
    'LOGIN_BONUS', 'MINIGAME_WIN', 'ADMIN_ADJUST', 'PROMO',
  ];

  readonly txLabels = TX_LABELS;

  constructor(
    private txService: ShopTransactionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.txService.findAll(this.page, this.limit, this.filterType, this.filterUserId)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: any) => { this.transactions = r.transactions; this.total = r.total; this.cdr.detectChanges(); } });
  }

  onFilter() { this.page = 1; this.load(); }
  resetFilters() { this.filterType = ''; this.filterUserId = ''; this.page = 1; this.load(); }

  get totalPages() { return Math.ceil(this.total / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }

  userName(tx: FritesTransaction): string {
    if (!tx.user) return '—';
    return `${tx.user.firstName ?? ''} ${tx.user.lastName ?? ''}`.trim() || tx.user.email;
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
