import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, finalize, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GameSettingService, GameSetting, GameStats, DayActivity, RecentPlayer } from '../../../core/services/game-setting.service';

@Component({
  selector: 'pdj-mini-game-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './mini-game-detail.html',
  styleUrl: './mini-game-detail.scss',
})
export class MiniGameDetail implements OnInit {
  game: GameSetting | null = null;
  loading = true;
  toggling = false;

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

  private gameId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameSettingService: GameSettingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id') || '';
    if (this.gameId) {
      this.loadGame();
    }
  }

  loadGame(): void {
    this.loading = true;

    forkJoin({
      game: this.gameSettingService.findOne(this.gameId),
      stats: this.gameSettingService.getStats(this.gameId).pipe(
        catchError(() => of({ status: 200, stats: this.stats }))
      ),
      activity: this.gameSettingService.getWeeklyActivity(this.gameId).pipe(
        catchError(() => of({ status: 200, activity: [] as DayActivity[] }))
      ),
      players: this.gameSettingService.getRecentPlayers(this.gameId).pipe(
        catchError(() => of({ status: 200, players: [] as RecentPlayer[] }))
      ),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          this.game = result.game.game;
          this.stats = result.stats.stats;
          this.weeklyActivity = result.activity.activity;
          this.recentPlayers = result.players.players;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load game:', err);
        },
      });
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

    this.gameSettingService.toggle(this.game.id, newState)
      .pipe(finalize(() => {
        this.toggling = false;
        this.cdr.detectChanges();
      }))
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
    return Math.max(...this.weeklyActivity.map(d => d.plays), 1);
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
