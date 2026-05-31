import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomizationCategory } from './customization-item.service';

export type GameRewardType =
  | 'none'
  | 'tombola_tickets'
  | 'id_card_customization';

export interface GameRewardCustomization {
  id: string;
  name: string;
  category: CustomizationCategory;
  itemKey: string;
}

export interface GameReward {
  id: string;
  label: string;
  rewardType: GameRewardType;
  ticketAmount: number | null;
  customizationItemId: string | null;
  customizationItem: GameRewardCustomization | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameRewardPayload {
  label: string;
  rewardType: GameRewardType;
  ticketAmount?: number;
  customizationItemId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateGameRewardPayload {
  label?: string;
  rewardType?: GameRewardType;
  ticketAmount?: number | null;
  customizationItemId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class GameRewardService {
  private readonly apiUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  listRewards(gameId: string): Observable<{
    status: number;
    rewards: GameReward[];
  }> {
    return this.http.get<{ status: number; rewards: GameReward[] }>(
      `${this.apiUrl}/settings/${gameId}/rewards`,
    );
  }

  createReward(
    gameId: string,
    payload: CreateGameRewardPayload,
  ): Observable<{ status: number; reward: GameReward }> {
    return this.http.post<{ status: number; reward: GameReward }>(
      `${this.apiUrl}/settings/${gameId}/rewards`,
      payload,
    );
  }

  updateReward(
    gameId: string,
    rewardId: string,
    payload: UpdateGameRewardPayload,
  ): Observable<{ status: number; reward: GameReward }> {
    return this.http.patch<{ status: number; reward: GameReward }>(
      `${this.apiUrl}/settings/${gameId}/rewards/${rewardId}`,
      payload,
    );
  }

  deleteReward(
    gameId: string,
    rewardId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/rewards/${rewardId}`,
    );
  }

  static rewardTypeLabel(type: GameRewardType): string {
    const labels: Record<GameRewardType, string> = {
      none: 'Rien',
      tombola_tickets: 'Tickets tombola',
      id_card_customization: 'Customisation ID Card',
    };
    return labels[type] ?? type;
  }

  static rewardDetail(reward: GameReward | null): string {
    if (!reward) return '—';
    if (reward.rewardType === 'tombola_tickets') {
      return `${reward.ticketAmount ?? 0} ticket(s)`;
    }
    if (reward.rewardType === 'id_card_customization') {
      return reward.customizationItem?.name ?? '—';
    }
    return '—';
  }
}
