import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameReward } from './game-reward.service';

export interface GameMysteryPoolEntry {
  id: string;
  rewardId: string;
  reward: GameReward | null;
  weight: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameMysteryPoolEntryPayload {
  rewardId: string;
  weight?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateGameMysteryPoolEntryPayload {
  rewardId?: string;
  weight?: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class GameMysteryService {
  private readonly apiUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  listPoolEntries(gameId: string): Observable<{
    status: number;
    entries: GameMysteryPoolEntry[];
  }> {
    return this.http.get<{ status: number; entries: GameMysteryPoolEntry[] }>(
      `${this.apiUrl}/settings/${gameId}/mystery-pool`,
    );
  }

  createPoolEntry(
    gameId: string,
    payload: CreateGameMysteryPoolEntryPayload,
  ): Observable<{ status: number; entry: GameMysteryPoolEntry }> {
    return this.http.post<{ status: number; entry: GameMysteryPoolEntry }>(
      `${this.apiUrl}/settings/${gameId}/mystery-pool`,
      payload,
    );
  }

  updatePoolEntry(
    gameId: string,
    entryId: string,
    payload: UpdateGameMysteryPoolEntryPayload,
  ): Observable<{ status: number; entry: GameMysteryPoolEntry }> {
    return this.http.patch<{ status: number; entry: GameMysteryPoolEntry }>(
      `${this.apiUrl}/settings/${gameId}/mystery-pool/${entryId}`,
      payload,
    );
  }

  deletePoolEntry(
    gameId: string,
    entryId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/mystery-pool/${entryId}`,
    );
  }
}
