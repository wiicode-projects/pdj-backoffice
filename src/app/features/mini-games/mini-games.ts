import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { GameSettingService, GameSetting } from '../../core/services/game-setting.service';

@Component({
  selector: 'pdj-mini-games',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './mini-games.html',
  styleUrl: './mini-games.scss',
})
export class MiniGames implements OnInit {
  games: GameSetting[] = [];
  loading = true;
  togglingId: string | null = null;

  constructor(
    private gameSettingService: GameSettingService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadGames();
  }

  loadGames(): void {
    this.loading = true;
    this.gameSettingService.findAll()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          this.games = result.games ?? [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load game settings:', err);
        },
      });
  }

  toggleGame(game: GameSetting): void {
    if (this.togglingId) return;
    this.togglingId = game.id;
    const newState = !game.isActive;

    // Optimistic update
    game.isActive = newState;
    this.cdr.detectChanges();

    this.gameSettingService.toggle(game.id, newState)
      .pipe(finalize(() => {
        this.togglingId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          game.isActive = result.game.isActive;
          this.cdr.detectChanges();
        },
        error: () => {
          // Rollback
          game.isActive = !newState;
          this.cdr.detectChanges();
        },
      });
  }

  getGameIcon(slug: string): string {
    const icons: Record<string, string> = {
      spin_win: 'spin',
      mystery_box: 'mystery',
      quiz_flash: 'quiz',
      referral: 'referral',
    };
    return icons[slug] || 'default';
  }

  get activeCount(): number {
    return this.games.filter(g => g.isActive).length;
  }

  get inactiveCount(): number {
    return this.games.filter(g => !g.isActive).length;
  }

  navigateToGame(game: GameSetting): void {
    this.router.navigate(['/app/mini-games', game.id]);
  }
}
