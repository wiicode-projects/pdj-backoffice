import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomizationCategory } from './customization-item.service';

export type GameRewardType =
  | 'none'
  | 'tombola_tickets'
  | 'id_card_customization';

export interface GameWheelRewardCustomization {
  id: string;
  name: string;
  category: CustomizationCategory;
  itemKey: string;
}

export interface GameWheelReward {
  id: string;
  label: string;
  rewardType: GameRewardType;
  ticketAmount: number | null;
  customizationItemId: string | null;
  customizationItem: GameWheelRewardCustomization | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameWheelSegment {
  id: string;
  segmentIndex: number;
  rewardId: string;
  reward: GameWheelReward | null;
  color: string;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameWheelRewardPayload {
  label: string;
  rewardType: GameRewardType;
  ticketAmount?: number;
  customizationItemId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateGameWheelRewardPayload {
  label?: string;
  rewardType?: GameRewardType;
  ticketAmount?: number | null;
  customizationItemId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateGameWheelSegmentPayload {
  segmentIndex: number;
  rewardId?: string;
  reward?: CreateGameWheelRewardPayload;
  weight?: number;
  isActive?: boolean;
  color?: string;
}

export interface UpdateGameWheelSegmentPayload {
  segmentIndex?: number;
  rewardId?: string;
  weight?: number;
  isActive?: boolean;
  color?: string;
}

@Injectable({ providedIn: 'root' })
export class GameWheelService {
  private readonly apiUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  listRewards(gameId: string): Observable<{
    status: number;
    wheelSegmentCount: number;
    rewards: GameWheelReward[];
  }> {
    return this.http.get<{
      status: number;
      wheelSegmentCount: number;
      rewards: GameWheelReward[];
    }>(`${this.apiUrl}/settings/${gameId}/wheel-rewards`);
  }

  createReward(
    gameId: string,
    payload: CreateGameWheelRewardPayload,
  ): Observable<{ status: number; reward: GameWheelReward }> {
    return this.http.post<{ status: number; reward: GameWheelReward }>(
      `${this.apiUrl}/settings/${gameId}/wheel-rewards`,
      payload,
    );
  }

  updateReward(
    gameId: string,
    rewardId: string,
    payload: UpdateGameWheelRewardPayload,
  ): Observable<{ status: number; reward: GameWheelReward }> {
    return this.http.patch<{ status: number; reward: GameWheelReward }>(
      `${this.apiUrl}/settings/${gameId}/wheel-rewards/${rewardId}`,
      payload,
    );
  }

  deleteReward(
    gameId: string,
    rewardId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/wheel-rewards/${rewardId}`,
    );
  }

  listSegments(gameId: string): Observable<{
    status: number;
    wheelSegmentCount: number;
    segments: GameWheelSegment[];
  }> {
    return this.http.get<{
      status: number;
      wheelSegmentCount: number;
      segments: GameWheelSegment[];
    }>(`${this.apiUrl}/settings/${gameId}/wheel-segments`);
  }

  createSegment(
    gameId: string,
    payload: CreateGameWheelSegmentPayload,
  ): Observable<{ status: number; segment: GameWheelSegment }> {
    return this.http.post<{ status: number; segment: GameWheelSegment }>(
      `${this.apiUrl}/settings/${gameId}/wheel-segments`,
      payload,
    );
  }

  updateSegment(
    gameId: string,
    segmentId: string,
    payload: UpdateGameWheelSegmentPayload,
  ): Observable<{ status: number; segment: GameWheelSegment }> {
    return this.http.patch<{ status: number; segment: GameWheelSegment }>(
      `${this.apiUrl}/settings/${gameId}/wheel-segments/${segmentId}`,
      payload,
    );
  }

  deleteSegment(
    gameId: string,
    segmentId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/wheel-segments/${segmentId}`,
    );
  }

  updateWheelConfig(
    gameId: string,
    wheelSegmentCount: number,
  ): Observable<{ status: number; game: { id: string; wheelSegmentCount: number } }> {
    return this.http.patch<{ status: number; game: { id: string; wheelSegmentCount: number } }>(
      `${this.apiUrl}/settings/${gameId}/wheel-config`,
      { wheelSegmentCount },
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

  static rewardDetail(reward: GameWheelReward | null): string {
    if (!reward) return '—';
    if (reward.rewardType === 'tombola_tickets') {
      return `${reward.ticketAmount ?? 0} ticket(s)`;
    }
    if (reward.rewardType === 'id_card_customization') {
      return reward.customizationItem?.name ?? '—';
    }
    return '—';
  }

  static defaultSegmentColor(segmentIndex: number): string {
    const colors = [
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
    return colors[segmentIndex % colors.length];
  }
}
