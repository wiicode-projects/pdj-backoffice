import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import {
  GameSettingService,
  GameSetting,
} from '../../../core/services/game-setting.service';
import {
  GameRewardService,
  GameReward,
  GameRewardType,
  CreateGameRewardPayload,
} from '../../../core/services/game-reward.service';
import {
  CustomizationItem,
  CustomizationItemService,
} from '../../../core/services/customization-item.service';

const REWARD_CATALOG_SLUGS = new Set(['spin_win', 'quiz_flash', 'mystery_box']);

@Component({
  selector: 'pdj-mini-game-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './mini-game-rewards.html',
  styleUrl: './mini-game-rewards.scss',
})
export class MiniGameRewards implements OnInit {
  games: GameSetting[] = [];
  selectedGameId = '';
  loadingGames = true;
  catalogRewards: GameReward[] = [];
  loadingCatalog = false;
  customizationItems: CustomizationItem[] = [];

  showRewardModal = false;
  editingReward: GameReward | null = null;
  savingReward = false;
  rewardForm = {
    label: '',
    rewardType: 'none' as GameRewardType,
    ticketAmount: 1,
    customizationItemId: '',
    isActive: true,
    sortOrder: 0,
  };
  confirmDeleteRewardId: string | null = null;
  deletingReward = false;

  readonly rewardTypeLabel = GameRewardService.rewardTypeLabel;
  readonly rewardDetail = GameRewardService.rewardDetail;

  constructor(
    private gameSettingService: GameSettingService,
    private gameRewardService: GameRewardService,
    private customizationItemService: CustomizationItemService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadGames();
    this.loadCustomizationItems();
  }

  get rewardGames(): GameSetting[] {
    return this.games.filter((game) => REWARD_CATALOG_SLUGS.has(game.slug));
  }

  get selectedGame(): GameSetting | null {
    return this.rewardGames.find((game) => game.id === this.selectedGameId) ?? null;
  }

  loadGames(): void {
    this.loadingGames = true;

    this.gameSettingService
      .findAll()
      .pipe(
        finalize(() => {
          this.loadingGames = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.games = result.games ?? [];
          if (!this.selectedGameId && this.rewardGames.length > 0) {
            this.selectedGameId = this.rewardGames[0].id;
            this.loadCatalogRewards();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load games:', err);
        },
      });
  }

  loadCustomizationItems(): void {
    this.customizationItemService
      .findAll()
      .pipe(
        catchError(() => of({ status: 200, items: [] as CustomizationItem[] })),
      )
      .subscribe({
        next: (result) => {
          this.customizationItems = result.items.filter((item) => item.isActive);
          this.cdr.detectChanges();
        },
      });
  }

  onGameChange(): void {
    this.loadCatalogRewards();
  }

  loadCatalogRewards(): void {
    if (!this.selectedGameId) {
      this.catalogRewards = [];
      return;
    }

    this.loadingCatalog = true;

    this.gameRewardService
      .listRewards(this.selectedGameId)
      .pipe(
        finalize(() => {
          this.loadingCatalog = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.catalogRewards = result.rewards;
          this.cdr.detectChanges();
        },
      });
  }

  openCreateReward(): void {
    this.editingReward = null;
    this.rewardForm = {
      label: '',
      rewardType: 'none',
      ticketAmount: 1,
      customizationItemId: '',
      isActive: true,
      sortOrder: this.catalogRewards.length,
    };
    this.showRewardModal = true;
  }

  openEditReward(reward: GameReward): void {
    this.editingReward = reward;
    this.rewardForm = {
      label: reward.label,
      rewardType: reward.rewardType,
      ticketAmount: reward.ticketAmount ?? 1,
      customizationItemId: reward.customizationItemId ?? '',
      isActive: reward.isActive,
      sortOrder: reward.sortOrder,
    };
    this.showRewardModal = true;
  }

  closeRewardModal(): void {
    this.showRewardModal = false;
    this.editingReward = null;
  }

  onRewardTypeChange(): void {
    if (this.rewardForm.rewardType === 'tombola_tickets' && !this.rewardForm.ticketAmount) {
      this.rewardForm.ticketAmount = 1;
    }
  }

  saveReward(): void {
    if (!this.selectedGame || this.savingReward) return;

    const payload: CreateGameRewardPayload = {
      label: this.rewardForm.label.trim(),
      rewardType: this.rewardForm.rewardType,
      isActive: this.rewardForm.isActive,
      sortOrder: this.rewardForm.sortOrder,
    };

    if (this.rewardForm.rewardType === 'tombola_tickets') {
      payload.ticketAmount = Math.max(1, this.rewardForm.ticketAmount);
    }
    if (this.rewardForm.rewardType === 'id_card_customization') {
      payload.customizationItemId = this.rewardForm.customizationItemId || undefined;
    }

    this.savingReward = true;
    const request$ = this.editingReward
      ? this.gameRewardService.updateReward(this.selectedGame.id, this.editingReward.id, payload)
      : this.gameRewardService.createReward(this.selectedGame.id, payload);

    request$
      .pipe(
        finalize(() => {
          this.savingReward = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeRewardModal();
          this.loadCatalogRewards();
        },
        error: () => {
          alert('Enregistrement de la récompense échoué.');
        },
      });
  }

  askDeleteReward(rewardId: string): void {
    this.confirmDeleteRewardId = rewardId;
  }

  cancelDeleteReward(): void {
    this.confirmDeleteRewardId = null;
  }

  confirmDeleteReward(): void {
    if (!this.selectedGame || !this.confirmDeleteRewardId || this.deletingReward) return;

    this.deletingReward = true;
    this.gameRewardService
      .deleteReward(this.selectedGame.id, this.confirmDeleteRewardId)
      .pipe(
        finalize(() => {
          this.deletingReward = false;
          this.confirmDeleteRewardId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadCatalogRewards(),
        error: () => alert('Suppression de la récompense échouée.'),
      });
  }

  get activeCustomizationItems(): CustomizationItem[] {
    return this.customizationItems.filter((item) => item.isActive);
  }
}
