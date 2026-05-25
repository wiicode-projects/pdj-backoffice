import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, finalize, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  GameSettingService,
  GameSetting,
  GameStats,
  DayActivity,
  RecentPlayer,
  GameLimitPeriod,
} from '../../../core/services/game-setting.service';
import {
  GameWheelService,
  GameWheelReward,
  GameWheelSegment,
  GameRewardType,
  CreateGameWheelRewardPayload,
} from '../../../core/services/game-wheel.service';
import {
  CustomizationItem,
  CustomizationItemService,
} from '../../../core/services/customization-item.service';
import {
  formatGameLimitBadge,
  formatGameLimitDescription,
} from '../../../core/utils/game-limit-label';

@Component({
  selector: 'pdj-mini-game-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './mini-game-detail.html',
  styleUrl: './mini-game-detail.scss',
})
export class MiniGameDetail implements OnInit {
  game: GameSetting | null = null;
  loading = true;
  toggling = false;
  savingLimits = false;

  limitForm = {
    limitEnabled: true,
    limitPeriod: 'day' as GameLimitPeriod,
    maxPlaysPerPeriod: 1,
  };

  stats: GameStats = {
    totalPlays: 0,
    uniquePlayers: 0,
    playsToday: 0,
    playsThisWeek: 0,
    avgDurationSeconds: 0,
    completionRate: 0,
    totalPoints: 0,
    rewardsUnlocked: 0,
  };

  weeklyActivity: DayActivity[] = [];
  recentPlayers: RecentPlayer[] = [];

  wheelSegmentCount = 4;
  savingWheelConfig = false;
  wheelRewards: GameWheelReward[] = [];
  wheelSegments: GameWheelSegment[] = [];
  customizationItems: CustomizationItem[] = [];
  loadingWheel = false;

  showRewardModal = false;
  editingReward: GameWheelReward | null = null;
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

  showSegmentModal = false;
  editingSegment: GameWheelSegment | null = null;
  savingSegment = false;
  segmentForm = {
    segmentIndex: 0,
    rewardMode: 'existing' as 'existing' | 'inline',
    rewardId: '',
    weight: 1,
    isActive: true,
    color: '#DC2626',
    inlineReward: {
      label: '',
      rewardType: 'none' as GameRewardType,
      ticketAmount: 1,
      customizationItemId: '',
    },
  };
  confirmDeleteSegmentId: string | null = null;
  deletingSegment = false;

  readonly defaultSegmentColors = [
    '#DC2626',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#6366F1',
    '#F97316',
    '#84CC16',
    '#06B6D4',
    '#A855F7',
  ];

  readonly rewardTypeLabel = GameWheelService.rewardTypeLabel;
  readonly rewardDetail = GameWheelService.rewardDetail;

  private gameId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameSettingService: GameSettingService,
    private gameWheelService: GameWheelService,
    private customizationItemService: CustomizationItemService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id') || '';
    if (this.gameId) {
      this.loadGame();
    }
  }

  get isSpinWin(): boolean {
    return this.game?.slug === 'spin_win';
  }

  loadGame(): void {
    this.loading = true;

    forkJoin({
      game: this.gameSettingService.findOne(this.gameId),
      stats: this.gameSettingService.getStats(this.gameId).pipe(
        catchError(() => of({ status: 200, stats: this.stats })),
      ),
      activity: this.gameSettingService.getWeeklyActivity(this.gameId).pipe(
        catchError(() => of({ status: 200, activity: [] as DayActivity[] })),
      ),
      players: this.gameSettingService.getRecentPlayers(this.gameId).pipe(
        catchError(() => of({ status: 200, players: [] as RecentPlayer[] })),
      ),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.game = result.game.game;
          this.syncLimitForm();
          this.stats = result.stats.stats;
          this.weeklyActivity = result.activity.activity;
          this.recentPlayers = result.players.players;
          this.wheelSegmentCount = this.game?.wheelSegmentCount ?? 4;
          if (this.isSpinWin) {
            this.loadWheelData();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load game:', err);
        },
      });
  }

  loadWheelData(): void {
    if (!this.gameId) return;
    this.loadingWheel = true;

    forkJoin({
      rewards: this.gameWheelService.listRewards(this.gameId).pipe(
        catchError(() => of({ status: 200, wheelSegmentCount: 4, rewards: [] })),
      ),
      segments: this.gameWheelService.listSegments(this.gameId).pipe(
        catchError(() => of({ status: 200, wheelSegmentCount: 4, segments: [] })),
      ),
      customizations: this.customizationItemService.findAll().pipe(
        catchError(() => of({ status: 200, items: [] as CustomizationItem[] })),
      ),
    })
      .pipe(
        finalize(() => {
          this.loadingWheel = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.wheelRewards = result.rewards.rewards;
          this.wheelSegments = result.segments.segments;
          this.wheelSegmentCount =
            result.segments.wheelSegmentCount ?? this.wheelSegmentCount;
          this.customizationItems = result.customizations.items.filter(
            (item) => item.isActive,
          );
          this.cdr.detectChanges();
        },
      });
  }

  saveWheelConfig(): void {
    if (!this.game || this.savingWheelConfig) return;

    const count = Math.max(2, this.wheelSegmentCount);
    this.savingWheelConfig = true;

    this.gameWheelService
      .updateWheelConfig(this.game.id, count)
      .pipe(
        finalize(() => {
          this.savingWheelConfig = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.wheelSegmentCount = result.game.wheelSegmentCount;
          if (this.game) {
            this.game.wheelSegmentCount = result.game.wheelSegmentCount;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          alert('Enregistrement de la configuration roue échoué.');
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
      sortOrder: this.wheelRewards.length,
    };
    this.showRewardModal = true;
  }

  openEditReward(reward: GameWheelReward): void {
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
    if (!this.game || this.savingReward) return;

    const payload: CreateGameWheelRewardPayload = {
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
      ? this.gameWheelService.updateReward(this.game.id, this.editingReward.id, payload)
      : this.gameWheelService.createReward(this.game.id, payload);

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
          this.loadWheelData();
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
    if (!this.game || !this.confirmDeleteRewardId || this.deletingReward) return;

    this.deletingReward = true;
    this.gameWheelService
      .deleteReward(this.game.id, this.confirmDeleteRewardId)
      .pipe(
        finalize(() => {
          this.deletingReward = false;
          this.confirmDeleteRewardId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadWheelData(),
        error: () => alert('Suppression de la récompense échouée.'),
      });
  }

  openCreateSegment(): void {
    this.editingSegment = null;
    const segmentIndex = this.findNextSegmentIndex();
    this.segmentForm = {
      segmentIndex,
      rewardMode: 'existing',
      rewardId: this.wheelRewards[0]?.id ?? '',
      weight: 1,
      isActive: true,
      color: this.getDefaultSegmentColor(segmentIndex),
      inlineReward: {
        label: '',
        rewardType: 'none',
        ticketAmount: 1,
        customizationItemId: '',
      },
    };
    this.showSegmentModal = true;
  }

  openEditSegment(segment: GameWheelSegment): void {
    this.editingSegment = segment;
    this.segmentForm = {
      segmentIndex: segment.segmentIndex,
      rewardMode: 'existing',
      rewardId: segment.rewardId,
      weight: segment.weight,
      isActive: segment.isActive,
      color: segment.color ?? this.getDefaultSegmentColor(segment.segmentIndex),
      inlineReward: {
        label: '',
        rewardType: 'none',
        ticketAmount: 1,
        customizationItemId: '',
      },
    };
    this.showSegmentModal = true;
  }

  closeSegmentModal(): void {
    this.showSegmentModal = false;
    this.editingSegment = null;
  }

  findNextSegmentIndex(): number {
    const used = new Set(this.wheelSegments.map((s) => s.segmentIndex));
    for (let i = 0; i < this.wheelSegmentCount; i++) {
      if (!used.has(i)) return i;
    }
    return this.wheelSegmentCount;
  }

  getDefaultSegmentColor(segmentIndex: number): string {
    return this.defaultSegmentColors[segmentIndex % this.defaultSegmentColors.length];
  }

  onSegmentIndexChange(): void {
    if (this.editingSegment) return;
    this.segmentForm.color = this.getDefaultSegmentColor(this.segmentForm.segmentIndex);
  }

  saveSegment(): void {
    if (!this.game || this.savingSegment) return;

    this.savingSegment = true;

    if (this.editingSegment) {
      this.gameWheelService
        .updateSegment(this.game.id, this.editingSegment.id, {
          segmentIndex: this.segmentForm.segmentIndex,
          rewardId: this.segmentForm.rewardId,
          weight: Math.max(1, this.segmentForm.weight),
          isActive: this.segmentForm.isActive,
          color: this.segmentForm.color,
        })
        .pipe(
          finalize(() => {
            this.savingSegment = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: () => {
            this.closeSegmentModal();
            this.loadWheelData();
          },
          error: () => alert('Enregistrement du segment échoué.'),
        });
      return;
    }

    const payload: {
      segmentIndex: number;
      rewardId?: string;
      reward?: CreateGameWheelRewardPayload;
      weight: number;
      isActive: boolean;
      color: string;
    } = {
      segmentIndex: this.segmentForm.segmentIndex,
      weight: Math.max(1, this.segmentForm.weight),
      isActive: this.segmentForm.isActive,
      color: this.segmentForm.color,
    };

    if (this.segmentForm.rewardMode === 'existing') {
      payload.rewardId = this.segmentForm.rewardId;
    } else {
      payload.reward = {
        label: this.segmentForm.inlineReward.label.trim(),
        rewardType: this.segmentForm.inlineReward.rewardType,
      };
      if (this.segmentForm.inlineReward.rewardType === 'tombola_tickets') {
        payload.reward.ticketAmount = Math.max(
          1,
          this.segmentForm.inlineReward.ticketAmount,
        );
      }
      if (this.segmentForm.inlineReward.rewardType === 'id_card_customization') {
        payload.reward.customizationItemId =
          this.segmentForm.inlineReward.customizationItemId || undefined;
      }
    }

    this.gameWheelService
      .createSegment(this.game.id, payload)
      .pipe(
        finalize(() => {
          this.savingSegment = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeSegmentModal();
          this.loadWheelData();
        },
        error: () => alert('Enregistrement du segment échoué.'),
      });
  }

  askDeleteSegment(segmentId: string): void {
    this.confirmDeleteSegmentId = segmentId;
  }

  cancelDeleteSegment(): void {
    this.confirmDeleteSegmentId = null;
  }

  confirmDeleteSegment(): void {
    if (!this.game || !this.confirmDeleteSegmentId || this.deletingSegment) return;

    this.deletingSegment = true;
    this.gameWheelService
      .deleteSegment(this.game.id, this.confirmDeleteSegmentId)
      .pipe(
        finalize(() => {
          this.deletingSegment = false;
          this.confirmDeleteSegmentId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadWheelData(),
        error: () => alert('Suppression du segment échouée.'),
      });
  }

  get activeCustomizationItems(): CustomizationItem[] {
    return this.customizationItems.filter((item) => item.isActive);
  }

  goBack(): void {
    this.router.navigate(['/app/mini-games']);
  }

  toggleGame(): void {
    if (!this.game || this.toggling) return;
    this.toggling = true;
    const newState = !this.game.isActive;
    this.game.isActive = newState;
    this.cdr.detectChanges();

    this.gameSettingService
      .updateSettings(this.game.id, { isActive: newState })
      .pipe(
        finalize(() => {
          this.toggling = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          if (this.game) this.game.isActive = result.game.isActive;
          this.cdr.detectChanges();
        },
        error: () => {
          if (this.game) this.game.isActive = !newState;
          this.cdr.detectChanges();
        },
      });
  }

  syncLimitForm(): void {
    if (!this.game) return;
    this.limitForm = {
      limitEnabled: this.game.limitEnabled ?? true,
      limitPeriod: this.game.limitPeriod ?? 'day',
      maxPlaysPerPeriod: this.game.maxPlaysPerPeriod ?? 1,
    };
  }

  onLimitEnabledChange(): void {
    if (!this.limitForm.limitEnabled) return;
    if (!this.limitForm.maxPlaysPerPeriod || this.limitForm.maxPlaysPerPeriod < 1) {
      this.limitForm.maxPlaysPerPeriod = 1;
    }
  }

  saveLimits(): void {
    if (!this.game || this.savingLimits) return;

    const payload = {
      limitEnabled: this.limitForm.limitEnabled,
      limitPeriod: this.limitForm.limitPeriod,
      maxPlaysPerPeriod: this.limitForm.limitEnabled
        ? Math.max(1, this.limitForm.maxPlaysPerPeriod)
        : null,
    };

    this.savingLimits = true;
    this.gameSettingService
      .updateSettings(this.game.id, payload)
      .pipe(
        finalize(() => {
          this.savingLimits = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.game = result.game;
          this.syncLimitForm();
          this.cdr.detectChanges();
        },
        error: () => {
          alert('Enregistrement des limites échoué.');
        },
      });
  }

  getLimitSummary(): string {
    if (!this.game) return '—';
    return formatGameLimitBadge(this.game);
  }

  getLimitDescription(): string {
    if (!this.game) return '—';
    return formatGameLimitDescription(this.game);
  }

  getGameIcon(): string {
    const icons: Record<string, string> = {
      spin_win: 'spin',
      mystery_box: 'mystery',
      quiz_flash: 'quiz',
      referral: 'referral',
    };
    return icons[this.game?.slug || ''] || 'default';
  }

  getMaxPlays(): number {
    if (!this.weeklyActivity.length) return 1;
    return Math.max(...this.weeklyActivity.map((d) => d.plays), 1);
  }

  getBarHeight(plays: number): number {
    return Math.round((plays / this.getMaxPlays()) * 100);
  }

  formatDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
  }
}
