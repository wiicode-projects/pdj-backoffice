import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, take, timer } from 'rxjs';
import {
  TombolaHolder,
  TombolaItem,
  TombolaParticipant,
  TombolaReward,
  TombolaRewardRank,
  TombolaService,
  TombolaStats,
  TombolaStatus,
  TombolaWinner,
} from '../../../core/services/tombola.service';

@Component({
  selector: 'pdj-tombola-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './tombola-detail.html',
  styleUrl: './tombola-detail.scss',
})
export class TombolaDetail implements OnInit, OnDestroy {
  tombola: TombolaItem | null = null;
  stats: TombolaStats | null = null;
  loading = true;
  loadingRows = false;
  drawingRank: TombolaRewardRank | null = null;
  savingStatus = false;
  statusError = '';
  resettingTickets = false;
  resetTicketsMessage = '';
  resetTicketsError = '';
  selectedStatus: TombolaStatus = 'DRAFT';
  drawError = '';
  drawSuccess = '';
  showDrawModal = false;
  drawModalPhase: 'spinning' | 'ready' | 'revealed' = 'spinning';
  drawModalRank: TombolaRewardRank | null = null;
  spinningDisplayName = '';
  pendingDrawResult: {
    tombola: TombolaItem;
    winner: TombolaWinner;
    rank: TombolaRewardRank;
    remainingDraws: number;
  } | null = null;
  lastRevealedRank: TombolaRewardRank | null = null;
  private revealedWinnerRanks = new Set<TombolaRewardRank>();
  private spinInterval?: ReturnType<typeof setInterval>;
  private drawMinSpinDone = false;
  private drawApiDone = false;
  private readonly drawMinSpinMs = 5000;
  winners: TombolaWinner[] = [];
  nextDrawRank: TombolaRewardRank | null = null;
  hasParticipantSnapshot = false;

  holders: TombolaHolder[] = [];
  participants: TombolaParticipant[] = [];
  search = '';
  page = 1;
  limit = 20;
  total = 0;

  rewards: TombolaReward[] = [];
  showRewardModal = false;
  editingReward: TombolaReward | null = null;
  savingReward = false;
  rewardError = '';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  rewardForm = {
    name: '',
    rank: 1 as TombolaRewardRank,
  };

  readonly rankOptions: { value: TombolaRewardRank; labelKey: string }[] = [
    { value: 1, labelKey: 'TOMBOLA.RANK_FIRST' },
    { value: 2, labelKey: 'TOMBOLA.RANK_SECOND' },
    { value: 3, labelKey: 'TOMBOLA.RANK_THIRD' },
  ];

  readonly months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  private tombolaId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tombolaService: TombolaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tombolaId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTombola();
  }

  ngOnDestroy(): void {
    this.stopSpinAnimation();
  }

  get isDrawn(): boolean {
    return this.tombola?.status === 'DRAWN';
  }

  get isOpen(): boolean {
    return this.tombola?.status === 'OPEN';
  }

  get isDraft(): boolean {
    return this.tombola?.status === 'DRAFT';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get canManageRewards(): boolean {
    return !this.isDrawn && this.winners.length === 0;
  }

  get rewardsFull(): boolean {
    return this.rewards.length >= 3;
  }

  get hasPartialDraws(): boolean {
    return this.isOpen && this.winners.length > 0;
  }

  loadTombola(options: { silent?: boolean } = {}): void {
    if (!options.silent) {
      this.loading = true;
    }
    this.tombolaService.findOne(this.tombolaId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.tombola = res.tombola;
          this.selectedStatus = res.tombola.status;
          this.stats = res.stats;
          this.winners = (res.winners ?? []).sort((a, b) => a.rank - b.rank);
          this.revealedWinnerRanks = new Set(this.winners.map((winner) => winner.rank));
          this.nextDrawRank = res.nextDrawRank;
          this.hasParticipantSnapshot = res.hasParticipantSnapshot ?? false;
          this.rewards = (res.tombola.rewards ?? []).sort((a, b) => a.rank - b.rank);
          this.loadRows();
        },
        error: () => {
          if (!options.silent) this.goBack();
        },
      });
  }

  loadRows(): void {
    if (!this.tombola) return;
    this.loadingRows = true;

    if (this.hasParticipantSnapshot) {
      this.tombolaService.getParticipants(this.tombolaId, this.page, this.limit, this.search)
        .pipe(finalize(() => { this.loadingRows = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: (res) => {
            this.participants = res.participants;
            this.total = res.total;
            this.cdr.detectChanges();
          },
          error: () => {
            this.participants = [];
            this.total = 0;
            this.cdr.detectChanges();
          },
        });
      return;
    }

    this.tombolaService.getLiveHolders(this.tombolaId, this.page, this.limit, this.search)
      .pipe(finalize(() => { this.loadingRows = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => {
          this.holders = res.holders;
          this.total = res.total;
          this.cdr.detectChanges();
        },
      });
  }

  onSearch(): void {
    this.page = 1;
    this.loadRows();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadRows();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadRows();
    }
  }

  get canRunDraw(): boolean {
    return this.isOpen && this.drawBlockedReason === null;
  }

  get drawBlockedReason(): string | null {
    if (!this.isOpen) return null;
    if (this.rewards.length === 0) return 'ADD_REWARD';
    if (this.nextDrawRank === null) return 'ALL_DRAWN';
    if ((this.stats?.drawPoolCount ?? 0) === 0) return 'NO_DRAW_POOL';
    return null;
  }

  canDrawRank(rank: TombolaRewardRank): boolean {
    return this.canRunDraw && this.nextDrawRank === rank;
  }

  isDrawingRank(rank: TombolaRewardRank): boolean {
    return this.drawingRank === rank;
  }

  getWinnerForRank(rank: TombolaRewardRank): TombolaWinner | undefined {
    if (!this.revealedWinnerRanks.has(rank)) return undefined;
    return this.winners.find((winner) => winner.rank === rank);
  }

  getDrawModalReward(): TombolaReward | undefined {
    if (!this.drawModalRank) return undefined;
    return this.getRewardForRank(this.drawModalRank);
  }

  getRankLabel(rank: TombolaRewardRank): string {
    const map: Record<TombolaRewardRank, string> = {
      1: 'TOMBOLA.RANK_FIRST',
      2: 'TOMBOLA.RANK_SECOND',
      3: 'TOMBOLA.RANK_THIRD',
    };
    return map[rank];
  }

  drawConfirmMessage(rank: TombolaRewardRank): string {
    const count = this.stats?.participantCount ?? 0;
    const drawPool = this.stats?.drawPoolCount ?? 0;
    const tickets = this.stats?.totalTickets ?? 0;
    const reward = this.getRewardForRank(rank);
    const rewardName = reward?.name ?? `le ${rank}${rank === 1 ? 'er' : 'e'} prix`;
    return `Tirer ${rewardName} ?\n\n${count} participant(s) au tirage (${drawPool} avec des tickets), ${tickets} ticket(s) au total.\nSeuls les utilisateurs avec au moins 1 ticket peuvent gagner. Les gagnants précédents sont exclus.`;
  }

  resetAllUserTickets(): void {
    if (this.resettingTickets) return;
    if (!confirm('Remettre à zéro les tickets tombola de tous les utilisateurs ?')) return;

    this.resettingTickets = true;
    this.resetTicketsError = '';
    this.resetTicketsMessage = '';

    this.tombolaService.resetAllUserTickets()
      .pipe(finalize(() => {
        this.resettingTickets = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.resetTicketsMessage = `${res.message} (${res.affectedCount} utilisateur(s)).`;
          this.page = 1;
          this.loadTombola({ silent: true });
        },
        error: (err: { error?: { message?: string } }) => {
          this.resetTicketsError = err?.error?.message ?? 'Impossible de réinitialiser les tickets';
        },
      });
  }

  openTombola(): void {
    this.changeStatus('OPEN');
  }

  onStatusChange(status: TombolaStatus): void {
    if (!this.tombola || this.savingStatus || status === this.tombola.status) return;
    this.changeStatus(status);
  }

  private changeStatus(status: TombolaStatus): void {
    if (!this.tombola || this.savingStatus) return;

    const label = this.getStatusLabel(status);
    if (!confirm(`Passer la tombola au statut « ${label} » ?`)) {
      this.selectedStatus = this.tombola.status;
      this.cdr.detectChanges();
      return;
    }

    this.savingStatus = true;
    this.statusError = '';

    this.tombolaService.update(this.tombola.id, { status })
      .pipe(finalize(() => { this.savingStatus = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => this.loadTombola({ silent: true }),
        error: (err: { error?: { message?: string } }) => {
          this.statusError = err?.error?.message ?? 'Impossible de modifier le statut';
          this.selectedStatus = this.tombola!.status;
          this.cdr.detectChanges();
        },
      });
  }

  runDraw(rank?: TombolaRewardRank): void {
    const drawRank = rank ?? this.nextDrawRank;
    if (!this.tombola || this.drawingRank !== null || !this.isOpen || drawRank === null) return;
    if (!this.canDrawRank(drawRank)) return;
    if (!confirm(this.drawConfirmMessage(drawRank))) return;

    this.drawingRank = drawRank;
    this.drawModalRank = drawRank;
    this.drawError = '';
    this.drawSuccess = '';
    this.pendingDrawResult = null;
    this.drawMinSpinDone = false;
    this.drawApiDone = false;
    this.showDrawModal = true;
    this.drawModalPhase = 'spinning';
    this.startSpinAnimation(this.getSpinCandidateNames());

    timer(this.drawMinSpinMs)
      .pipe(take(1))
      .subscribe(() => {
        this.drawMinSpinDone = true;
        this.tryFinishDrawSpin();
        this.cdr.detectChanges();
      });

    this.tombolaService.runDraw(this.tombola.id, drawRank)
      .pipe(
        take(1),
        finalize(() => {
          this.stopSpinAnimation();
          this.drawingRank = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          this.pendingDrawResult = {
            tombola: result.tombola,
            winner: result.winner,
            rank: result.rank,
            remainingDraws: result.remainingDraws,
          };
          this.drawApiDone = true;
          this.tryFinishDrawSpin();
          this.cdr.detectChanges();
        },
        error: (err: { error?: { message?: string } }) => {
          this.showDrawModal = false;
          this.drawModalRank = null;
          this.pendingDrawResult = null;
          this.drawError = err?.error?.message ?? 'Erreur lors du tirage';
          this.cdr.detectChanges();
        },
      });
  }

  revealDrawWinner(): void {
    if (this.drawModalPhase !== 'ready' || !this.pendingDrawResult) return;

    this.drawModalPhase = 'revealed';
    this.spinningDisplayName = this.getFullName(
      this.pendingDrawResult.winner.user.firstName,
      this.pendingDrawResult.winner.user.lastName,
    );
    this.cdr.detectChanges();
  }

  private tryFinishDrawSpin(): void {
    if (!this.drawMinSpinDone || !this.drawApiDone || !this.pendingDrawResult) return;
    if (this.drawModalPhase !== 'spinning') return;

    this.drawModalPhase = 'ready';
    this.stopSpinAnimation();
  }

  closeDrawModal(): void {
    if (this.drawModalPhase !== 'revealed' || !this.pendingDrawResult) return;

    const { tombola, winner, rank, remainingDraws } = this.pendingDrawResult;
    this.tombola = tombola;
    this.upsertWinner(winner);
    this.revealedWinnerRanks.add(winner.rank);
    this.lastRevealedRank = winner.rank;
    this.nextDrawRank = remainingDraws > 0 ? this.getNextRankAfter(rank) : null;
    this.drawSuccess = remainingDraws > 0
      ? `Tirage du ${rank}${rank === 1 ? 'er' : 'e'} prix effectué. ${remainingDraws} tirage(s) restant(s).`
      : 'Tous les tirages ont été effectués.';
    this.showDrawModal = false;
    this.drawModalRank = null;
    this.pendingDrawResult = null;
    this.page = 1;
    this.loadTombola({ silent: true });
    setTimeout(() => {
      this.lastRevealedRank = null;
      this.cdr.detectChanges();
    }, 1200);
    this.cdr.detectChanges();
  }

  private getSpinCandidateNames(): string[] {
    const names = this.hasParticipantSnapshot
      ? this.participants.map((participant) =>
          this.getFullName(participant.user.firstName, participant.user.lastName),
        )
      : this.holders.map((holder) =>
          this.getFullName(holder.firstName, holder.lastName),
        );

    const filtered = names.filter((name) => name !== 'Utilisateur');
    return filtered.length > 0 ? filtered : ['...'];
  }

  private startSpinAnimation(names: string[]): void {
    this.stopSpinAnimation();
    let index = 0;
    this.spinningDisplayName = names[index];
    this.spinInterval = setInterval(() => {
      index = (index + 1) % names.length;
      this.spinningDisplayName = names[index];
      this.cdr.detectChanges();
    }, 90);
  }

  private stopSpinAnimation(): void {
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
      this.spinInterval = undefined;
    }
  }

  private getNextRankAfter(current: TombolaRewardRank): TombolaRewardRank | null {
    const sorted = [...this.rewards].sort((a, b) => a.rank - b.rank);
    const currentIndex = sorted.findIndex((reward) => reward.rank === current);
    const nextReward = sorted[currentIndex + 1];
    return nextReward?.rank ?? null;
  }

  private upsertWinner(winner: TombolaWinner): void {
    const index = this.winners.findIndex((item) => item.rank === winner.rank);
    if (index >= 0) {
      this.winners[index] = winner;
    } else {
      this.winners = [...this.winners, winner].sort((a, b) => a.rank - b.rank);
    }
  }

  goBack(): void {
    this.router.navigate(['/app/tombola']);
  }

  getPeriodLabel(): string {
    if (!this.tombola) return '';
    const month = this.months[this.tombola.month - 1] ?? this.tombola.month;
    return `${month} ${this.tombola.year}`;
  }

  getStatusLabel(status: TombolaStatus): string {
    const map: Record<TombolaStatus, string> = {
      DRAFT: 'Brouillon',
      OPEN: 'Ouverte',
      DRAWN: 'Tirée',
    };
    return map[status] ?? status;
  }

  getInitials(firstName: string | null, lastName: string | null): string {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  getFullName(firstName: string | null, lastName: string | null): string {
    return `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Utilisateur';
  }

  getRewardForRank(rank: TombolaRewardRank): TombolaReward | undefined {
    return this.rewards.find((reward) => reward.rank === rank);
  }

  getAvailableRanks(): TombolaRewardRank[] {
    const used = new Set(this.rewards.map((reward) => reward.rank));
    return ([1, 2, 3] as TombolaRewardRank[]).filter((rank) => {
      if (this.editingReward?.rank === rank) return true;
      return !used.has(rank);
    });
  }

  openCreateReward(preferredRank?: TombolaRewardRank): void {
    const available = this.getAvailableRanks();
    if (available.length === 0) return;

    const rank = preferredRank && available.includes(preferredRank)
      ? preferredRank
      : available[0];

    this.editingReward = null;
    this.rewardForm = { name: '', rank };
    this.imagePreview = null;
    this.selectedFile = null;
    this.rewardError = '';
    this.showRewardModal = true;
    this.cdr.detectChanges();
  }

  openEditReward(reward: TombolaReward): void {
    this.editingReward = reward;
    this.rewardForm = { name: reward.name, rank: reward.rank };
    this.imagePreview = reward.imageUrl;
    this.selectedFile = null;
    this.rewardError = '';
    this.showRewardModal = true;
    this.cdr.detectChanges();
  }

  closeRewardModal(): void {
    this.showRewardModal = false;
    this.cdr.detectChanges();
  }

  onRewardFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveReward(): void {
    if (!this.tombola || this.savingReward || !this.rewardForm.name.trim()) return;
    if (!this.editingReward && !this.selectedFile) {
      this.rewardError = 'Une image est requise';
      this.cdr.detectChanges();
      return;
    }

    this.savingReward = true;
    this.rewardError = '';

    const fd = new FormData();
    fd.append('name', this.rewardForm.name.trim());
    fd.append('rank', String(this.rewardForm.rank));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    const req$ = this.editingReward
      ? this.tombolaService.updateReward(this.tombola.id, this.editingReward.id, fd)
      : this.tombolaService.createReward(this.tombola.id, fd);

    req$.subscribe({
      next: (res) => {
        this.savingReward = false;
        this.showRewardModal = false;
        this.editingReward = null;
        this.selectedFile = null;
        this.imagePreview = null;
        this.rewardError = '';
        this.upsertReward(res.reward);
        this.loadTombola({ silent: true });
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.savingReward = false;
        this.rewardError = err?.error?.message ?? 'Erreur lors de l\'enregistrement';
        this.cdr.detectChanges();
      },
    });
  }

  private upsertReward(reward: TombolaReward): void {
    const index = this.rewards.findIndex((item) => item.id === reward.id);
    if (index >= 0) {
      this.rewards[index] = reward;
    } else {
      this.rewards = [...this.rewards, reward];
    }
    this.rewards.sort((a, b) => a.rank - b.rank);
  }

  deleteReward(reward: TombolaReward): void {
    if (!this.tombola || !confirm(`Supprimer la récompense « ${reward.name} » ?`)) return;

    this.tombolaService.deleteReward(this.tombola.id, reward.id).subscribe({
      next: () => this.loadTombola(),
    });
  }
}
