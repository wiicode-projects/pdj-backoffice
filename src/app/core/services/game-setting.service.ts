import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type GameLimitPeriod = 'day' | 'week';

export interface GameSetting {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  maxPlaysPerPeriod: number | null;
  limitPeriod: GameLimitPeriod;
  limitEnabled: boolean;
  wheelSegmentCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateGameSettingPayload {
  isActive?: boolean;
  name?: string;
  description?: string;
  limitEnabled?: boolean;
  limitPeriod?: GameLimitPeriod;
  maxPlaysPerPeriod?: number | null;
}

export interface GameStats {
  totalPlays: number;
  uniquePlayers: number;
  playsToday: number;
  playsThisWeek: number;
  avgDurationSeconds: number;
  completionRate: number;
  totalPoints: number;
  rewardsUnlocked: number;
}

export interface DayActivity {
  date: string;
  dayLabel: string;
  plays: number;
}

export interface RecentPlayer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalPlays: number;
  lastPlayed: string;
}

@Injectable({
  providedIn: 'root',
})
export class GameSettingService {
  private readonly apiUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; games: GameSetting[] }> {
    return this.http.get<{ status: number; games: GameSetting[] }>(`${this.apiUrl}/settings`);
  }

  findOne(id: string): Observable<{ status: number; game: GameSetting }> {
    return this.http.get<{ status: number; game: GameSetting }>(`${this.apiUrl}/settings/${id}`);
  }

  toggle(id: string, isActive: boolean): Observable<{ status: number; game: GameSetting }> {
    return this.updateSettings(id, { isActive });
  }

  updateSettings(
    id: string,
    payload: UpdateGameSettingPayload,
  ): Observable<{ status: number; game: GameSetting }> {
    return this.http.patch<{ status: number; game: GameSetting }>(
      `${this.apiUrl}/settings/${id}`,
      payload,
    );
  }

  getStats(gameId: string): Observable<{ status: number; stats: GameStats }> {
    return this.http.get<{ status: number; stats: GameStats }>(`${this.apiUrl}/${gameId}/stats`);
  }

  getWeeklyActivity(gameId: string): Observable<{ status: number; activity: DayActivity[] }> {
    return this.http.get<{ status: number; activity: DayActivity[] }>(`${this.apiUrl}/${gameId}/activity`);
  }

  getRecentPlayers(gameId: string): Observable<{ status: number; players: RecentPlayer[] }> {
    return this.http.get<{ status: number; players: RecentPlayer[] }>(`${this.apiUrl}/${gameId}/players`);
  }
}
