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
  GameWheelSegment,
  CreateGameWheelRewardPayload,
} from '../../../core/services/game-wheel.service';
import {
  GameRewardService,
  GameReward,
  GameRewardType,
} from '../../../core/services/game-reward.service';
import {
  GameMysteryService,
  GameMysteryPoolEntry,
  CreateGameMysteryPoolEntryPayload,
} from '../../../core/services/game-mystery.service';
import {
  GameQuizService,
  GameQuizQuestion,
  GameQuizRewardTier,
  CreateGameQuizQuestionPayload,
  CreateGameQuizRewardTierPayload,
} from '../../../core/services/game-quiz.service';
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
  catalogRewards: GameReward[] = [];
  wheelSegments: GameWheelSegment[] = [];
  customizationItems: CustomizationItem[] = [];
  loadingWheel = false;

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

  quizQuestionsPerSession = 3;
  quizSecondsPerQuestion = 10;
  savingQuizConfig = false;
  quizQuestions: GameQuizQuestion[] = [];
  quizRewardTiers: GameQuizRewardTier[] = [];
  loadingQuiz = false;

  showQuestionModal = false;
  editingQuestion: GameQuizQuestion | null = null;
  savingQuestion = false;
  questionForm = {
    category: '',
    question: '',
    isActive: true,
    sortOrder: 0,
    answers: [
      { label: '', isCorrect: true },
      { label: '', isCorrect: false },
      { label: '', isCorrect: false },
      { label: '', isCorrect: false },
    ],
  };
  confirmDeleteQuestionId: string | null = null;
  deletingQuestion = false;

  showTierModal = false;
  editingTier: GameQuizRewardTier | null = null;
  savingTier = false;
  tierForm = {
    minCorrectAnswers: 0,
    rewardId: '',
    label: '',
    isActive: true,
    sortOrder: 0,
  };
  confirmDeleteTierId: string | null = null;
  deletingTier = false;

  mysteryPoolEntries: GameMysteryPoolEntry[] = [];
  loadingMystery = false;
  showPoolModal = false;
  editingPoolEntry: GameMysteryPoolEntry | null = null;
  savingPoolEntry = false;
  poolForm = {
    rewardId: '',
    weight: 1,
    isActive: true,
    sortOrder: 0,
  };
  confirmDeletePoolEntryId: string | null = null;
  deletingPoolEntry = false;

  readonly correctAnswerLabel = GameQuizService.correctAnswerLabel;

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

  readonly rewardTypeLabel = GameRewardService.rewardTypeLabel;
  readonly rewardDetail = GameRewardService.rewardDetail;

  private gameId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameSettingService: GameSettingService,
    private gameWheelService: GameWheelService,
    private gameRewardService: GameRewardService,
    private gameQuizService: GameQuizService,
    private gameMysteryService: GameMysteryService,
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

  get isQuizFlash(): boolean {
    return this.game?.slug === 'quiz_flash';
  }

  get isMysteryBox(): boolean {
    return this.game?.slug === 'mystery_box';
  }

  get hasRewardCatalog(): boolean {
    return this.isSpinWin || this.isQuizFlash || this.isMysteryBox;
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
          this.quizQuestionsPerSession = this.game?.quizQuestionsPerSession ?? 3;
          this.quizSecondsPerQuestion = this.game?.quizSecondsPerQuestion ?? 10;
          if (this.hasRewardCatalog) {
            this.loadCatalogRewards();
            this.loadCustomizationItems();
          }
          if (this.isSpinWin) {
            this.loadWheelData();
          }
          if (this.isQuizFlash) {
            this.loadQuizData();
          }
          if (this.isMysteryBox) {
            this.loadMysteryData();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load game:', err);
        },
      });
  }

  loadCatalogRewards(): void {
    if (!this.gameId) return;

    this.gameRewardService
      .listRewards(this.gameId)
      .subscribe({
        next: (result) => {
          this.catalogRewards = result.rewards;
          this.cdr.detectChanges();
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

  loadWheelData(): void {
    if (!this.gameId) return;
    this.loadingWheel = true;

    forkJoin({
      segments: this.gameWheelService.listSegments(this.gameId).pipe(
        catchError(() => of({ status: 200, wheelSegmentCount: 4, segments: [] })),
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
          this.wheelSegments = result.segments.segments;
          this.wheelSegmentCount =
            result.segments.wheelSegmentCount ?? this.wheelSegmentCount;
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

  openCreateSegment(): void {
    this.editingSegment = null;
    const segmentIndex = this.findNextSegmentIndex();
    this.segmentForm = {
      segmentIndex,
      rewardMode: 'existing',
      rewardId: this.catalogRewards[0]?.id ?? '',
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
    if (!this.catalogRewards.length) {
      this.loadCatalogRewards();
    }
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

  get segmentRewardOptions(): GameReward[] {
    const rewardId = this.editingSegment?.rewardId;
    const currentReward = this.editingSegment?.reward;

    if (!rewardId) {
      return this.catalogRewards;
    }

    if (this.catalogRewards.some((reward) => reward.id === rewardId)) {
      return this.catalogRewards;
    }

    if (currentReward) {
      return [
        {
          id: currentReward.id,
          label: currentReward.label,
          rewardType: currentReward.rewardType,
          ticketAmount: currentReward.ticketAmount,
          customizationItemId: currentReward.customizationItemId,
          customizationItem: currentReward.customizationItem,
          isActive: currentReward.isActive,
          sortOrder: currentReward.sortOrder,
          createdAt: currentReward.createdAt,
          updatedAt: currentReward.updatedAt,
        },
        ...this.catalogRewards,
      ];
    }

    return [
      {
        id: rewardId,
        label: 'Récompense actuelle',
        rewardType: 'none',
        ticketAmount: null,
        customizationItemId: null,
        customizationItem: null,
        isActive: true,
        sortOrder: 0,
        createdAt: '',
        updatedAt: '',
      },
      ...this.catalogRewards,
    ];
  }

  compareRewardIds(
    first: string | null | undefined,
    second: string | null | undefined,
  ): boolean {
    return (first ?? '') === (second ?? '');
  }

  get canSaveSegment(): boolean {
    if (this.savingSegment) return false;

    const segmentIndex = Number(this.segmentForm.segmentIndex);
    if (!Number.isFinite(segmentIndex) || segmentIndex < 0) {
      return false;
    }

    if (this.editingSegment) {
      return !!(this.segmentForm.rewardId || this.editingSegment.rewardId);
    }

    if (this.segmentForm.rewardMode === 'existing') {
      return !!this.segmentForm.rewardId;
    }

    return !!this.segmentForm.inlineReward.label.trim();
  }

  onSegmentIndexChange(): void {
    if (this.editingSegment) return;
    this.segmentForm.color = this.getDefaultSegmentColor(this.segmentForm.segmentIndex);
  }

  saveSegment(): void {
    if (!this.game || this.savingSegment || !this.canSaveSegment) return;

    this.savingSegment = true;
    const fallbacks = this.editingSegment
      ? {
          rewardId: this.editingSegment.rewardId,
          color: this.editingSegment.color,
          segmentIndex: this.editingSegment.segmentIndex,
        }
      : undefined;

    if (this.editingSegment) {
      this.gameWheelService
        .updateSegment(
          this.game.id,
          this.editingSegment.id,
          {
            segmentIndex: this.segmentForm.segmentIndex,
            rewardId: this.segmentForm.rewardId,
            weight: this.segmentForm.weight,
            isActive: this.segmentForm.isActive,
            color: this.segmentForm.color,
          },
          fallbacks,
        )
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
          error: (err) => alert(this.formatSegmentError(err)),
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
      weight: this.segmentForm.weight,
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
      .createSegment(this.game.id, payload, {
        segmentIndex: this.segmentForm.segmentIndex,
        color: this.segmentForm.color,
        rewardId: this.segmentForm.rewardId,
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
          if (this.segmentForm.rewardMode === 'inline') {
            this.loadCatalogRewards();
          }
        },
        error: (err) => alert(this.formatSegmentError(err)),
      });
  }

  private formatSegmentError(err: { error?: { message?: string | string[] } }): string {
    const message = err?.error?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return 'Enregistrement du segment échoué.';
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

  loadQuizData(): void {
    if (!this.gameId) return;
    this.loadingQuiz = true;

    forkJoin({
      questions: this.gameQuizService.listQuestions(this.gameId).pipe(
        catchError(() =>
          of({
            status: 200,
            quizQuestionsPerSession: 3,
            quizSecondsPerQuestion: 10,
            questions: [] as GameQuizQuestion[],
          }),
        ),
      ),
      tiers: this.gameQuizService.listRewardTiers(this.gameId).pipe(
        catchError(() => of({ status: 200, tiers: [] as GameQuizRewardTier[] })),
      ),
    })
      .pipe(
        finalize(() => {
          this.loadingQuiz = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.quizQuestions = result.questions.questions;
          this.quizRewardTiers = result.tiers.tiers;
          this.quizQuestionsPerSession =
            result.questions.quizQuestionsPerSession ?? this.quizQuestionsPerSession;
          this.quizSecondsPerQuestion =
            result.questions.quizSecondsPerQuestion ?? this.quizSecondsPerQuestion;
          this.cdr.detectChanges();
        },
      });
  }

  saveQuizConfig(): void {
    if (!this.game || this.savingQuizConfig) return;

    this.savingQuizConfig = true;
    this.gameQuizService
      .updateQuizConfig(
        this.game.id,
        Math.max(1, this.quizQuestionsPerSession),
        Math.max(5, this.quizSecondsPerQuestion),
      )
      .pipe(
        finalize(() => {
          this.savingQuizConfig = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.quizQuestionsPerSession = result.game.quizQuestionsPerSession;
          this.quizSecondsPerQuestion = result.game.quizSecondsPerQuestion;
          if (this.game) {
            this.game.quizQuestionsPerSession = result.game.quizQuestionsPerSession;
            this.game.quizSecondsPerQuestion = result.game.quizSecondsPerQuestion;
          }
        },
        error: () => alert('Enregistrement de la configuration quiz échoué.'),
      });
  }

  openCreateQuestion(): void {
    this.editingQuestion = null;
    this.questionForm = {
      category: '',
      question: '',
      isActive: true,
      sortOrder: this.quizQuestions.length,
      answers: [
        { label: '', isCorrect: true },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
      ],
    };
    this.showQuestionModal = true;
  }

  openEditQuestion(question: GameQuizQuestion): void {
    this.editingQuestion = question;
    const answers = [...(question.answers ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 4)
      .map((answer) => ({ label: answer.label, isCorrect: answer.isCorrect }));

    while (answers.length < 4) {
      answers.push({ label: '', isCorrect: false });
    }

    this.questionForm = {
      category: question.category,
      question: question.question,
      isActive: question.isActive,
      sortOrder: question.sortOrder,
      answers,
    };
    this.showQuestionModal = true;
  }

  closeQuestionModal(): void {
    this.showQuestionModal = false;
    this.editingQuestion = null;
  }

  setCorrectAnswer(index: number): void {
    this.questionForm.answers = this.questionForm.answers.map((answer, i) => ({
      ...answer,
      isCorrect: i === index,
    }));
  }

  saveQuestion(): void {
    if (!this.game || this.savingQuestion) return;

    const payload: CreateGameQuizQuestionPayload = {
      category: this.questionForm.category.trim(),
      question: this.questionForm.question.trim(),
      isActive: this.questionForm.isActive,
      sortOrder: this.questionForm.sortOrder,
      answers: this.questionForm.answers.map((answer, index) => ({
        label: answer.label.trim(),
        isCorrect: answer.isCorrect,
        sortOrder: index,
      })),
    };

    this.savingQuestion = true;
    const request$ = this.editingQuestion
      ? this.gameQuizService.updateQuestion(this.game.id, this.editingQuestion.id, payload)
      : this.gameQuizService.createQuestion(this.game.id, payload);

    request$
      .pipe(
        finalize(() => {
          this.savingQuestion = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeQuestionModal();
          this.loadQuizData();
        },
        error: () => alert('Enregistrement de la question échoué.'),
      });
  }

  askDeleteQuestion(questionId: string): void {
    this.confirmDeleteQuestionId = questionId;
  }

  cancelDeleteQuestion(): void {
    this.confirmDeleteQuestionId = null;
  }

  confirmDeleteQuestion(): void {
    if (!this.game || !this.confirmDeleteQuestionId || this.deletingQuestion) return;

    this.deletingQuestion = true;
    this.gameQuizService
      .deleteQuestion(this.game.id, this.confirmDeleteQuestionId)
      .pipe(
        finalize(() => {
          this.deletingQuestion = false;
          this.confirmDeleteQuestionId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadQuizData(),
        error: () => alert('Suppression de la question échouée.'),
      });
  }

  openCreateTier(): void {
    this.editingTier = null;
    this.tierForm = {
      minCorrectAnswers: 0,
      rewardId: this.catalogRewards[0]?.id ?? '',
      label: '',
      isActive: true,
      sortOrder: this.quizRewardTiers.length,
    };
    this.showTierModal = true;
  }

  openEditTier(tier: GameQuizRewardTier): void {
    this.editingTier = tier;
    this.tierForm = {
      minCorrectAnswers: tier.minCorrectAnswers,
      rewardId: tier.rewardId,
      label: tier.label ?? '',
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
    };
    this.showTierModal = true;
  }

  closeTierModal(): void {
    this.showTierModal = false;
    this.editingTier = null;
  }

  saveTier(): void {
    if (!this.game || this.savingTier) return;

    const payload: CreateGameQuizRewardTierPayload = {
      minCorrectAnswers: this.tierForm.minCorrectAnswers,
      rewardId: this.tierForm.rewardId,
      label: this.tierForm.label.trim() || undefined,
      isActive: this.tierForm.isActive,
      sortOrder: this.tierForm.sortOrder,
    };

    this.savingTier = true;
    const request$ = this.editingTier
      ? this.gameQuizService.updateRewardTier(this.game.id, this.editingTier.id, payload)
      : this.gameQuizService.createRewardTier(this.game.id, payload);

    request$
      .pipe(
        finalize(() => {
          this.savingTier = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closeTierModal();
          this.loadQuizData();
        },
        error: () => alert('Enregistrement de la récompense échoué.'),
      });
  }

  askDeleteTier(tierId: string): void {
    this.confirmDeleteTierId = tierId;
  }

  cancelDeleteTier(): void {
    this.confirmDeleteTierId = null;
  }

  confirmDeleteTier(): void {
    if (!this.game || !this.confirmDeleteTierId || this.deletingTier) return;

    this.deletingTier = true;
    this.gameQuizService
      .deleteRewardTier(this.game.id, this.confirmDeleteTierId)
      .pipe(
        finalize(() => {
          this.deletingTier = false;
          this.confirmDeleteTierId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadQuizData(),
        error: () => alert('Suppression de la récompense échouée.'),
      });
  }

  loadMysteryData(): void {
    if (!this.gameId) return;
    this.loadingMystery = true;

    this.gameMysteryService
      .listPoolEntries(this.gameId)
      .pipe(
        finalize(() => {
          this.loadingMystery = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.mysteryPoolEntries = result.entries;
          this.cdr.detectChanges();
        },
      });
  }

  openCreatePoolEntry(): void {
    this.editingPoolEntry = null;
    this.poolForm = {
      rewardId: this.catalogRewards[0]?.id ?? '',
      weight: 1,
      isActive: true,
      sortOrder: this.mysteryPoolEntries.length,
    };
    this.showPoolModal = true;
  }

  openEditPoolEntry(entry: GameMysteryPoolEntry): void {
    this.editingPoolEntry = entry;
    this.poolForm = {
      rewardId: entry.rewardId,
      weight: entry.weight,
      isActive: entry.isActive,
      sortOrder: entry.sortOrder,
    };
    this.showPoolModal = true;
  }

  closePoolModal(): void {
    this.showPoolModal = false;
    this.editingPoolEntry = null;
  }

  savePoolEntry(): void {
    if (!this.game || this.savingPoolEntry || !this.poolForm.rewardId) return;

    const payload: CreateGameMysteryPoolEntryPayload = {
      rewardId: this.poolForm.rewardId,
      weight: Math.max(1, this.poolForm.weight),
      isActive: this.poolForm.isActive,
      sortOrder: this.poolForm.sortOrder,
    };

    this.savingPoolEntry = true;
    const request$ = this.editingPoolEntry
      ? this.gameMysteryService.updatePoolEntry(this.game.id, this.editingPoolEntry.id, payload)
      : this.gameMysteryService.createPoolEntry(this.game.id, payload);

    request$
      .pipe(
        finalize(() => {
          this.savingPoolEntry = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.closePoolModal();
          this.loadMysteryData();
        },
        error: () => alert('Enregistrement de l\'entrée pool échoué.'),
      });
  }

  askDeletePoolEntry(entryId: string): void {
    this.confirmDeletePoolEntryId = entryId;
  }

  cancelDeletePoolEntry(): void {
    this.confirmDeletePoolEntryId = null;
  }

  confirmDeletePoolEntry(): void {
    if (!this.game || !this.confirmDeletePoolEntryId || this.deletingPoolEntry) return;

    this.deletingPoolEntry = true;
    this.gameMysteryService
      .deletePoolEntry(this.game.id, this.confirmDeletePoolEntryId)
      .pipe(
        finalize(() => {
          this.deletingPoolEntry = false;
          this.confirmDeletePoolEntryId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.loadMysteryData(),
        error: () => alert('Suppression de l\'entrée pool échouée.'),
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
