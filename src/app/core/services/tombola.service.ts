import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TombolaStatus = 'DRAFT' | 'OPEN' | 'DRAWN';
export type TombolaRewardRank = 1 | 2 | 3;

export interface TombolaReward {
  id: string;
  tombolaId: string;
  name: string;
  imageUrl: string | null;
  rank: TombolaRewardRank;
  createdAt: string;
  updatedAt: string;
}

export interface TombolaItem {
  id: string;
  year: number;
  month: number;
  title: string;
  status: TombolaStatus;
  prizeDescription: string | null;
  drawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  rewards?: TombolaReward[];
}

export interface TombolaStats {
  participantCount: number;
  drawPoolCount: number;
  totalTickets: number;
  winnerCount: number;
}

export interface TombolaHolder {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  tombolaTicketBalance: number;
  isActive: boolean;
}

export interface TombolaParticipantUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface TombolaWinner {
  id: string;
  tombolaId: string;
  userId: string;
  rewardId: string;
  rank: TombolaRewardRank;
  ticketCount: number;
  drawnAt: string;
  user: TombolaParticipantUser;
  reward?: TombolaReward;
}

export interface TombolaParticipant {
  id: string;
  tombolaId: string;
  userId: string;
  ticketCount: number;
  isWinner: boolean;
  wonRank: TombolaRewardRank | null;
  createdAt: string;
  user: TombolaParticipantUser;
}

export interface CreateTombolaPayload {
  year: number;
  month: number;
  title?: string;
  prizeDescription?: string;
}

@Injectable({ providedIn: 'root' })
export class TombolaService {
  private readonly apiUrl = `${environment.apiUrl}/tombola`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; tombolas: TombolaItem[] }> {
    return this.http.get<{ status: number; tombolas: TombolaItem[] }>(this.apiUrl);
  }

  findOne(id: string): Observable<{
    status: number;
    tombola: TombolaItem;
    stats: TombolaStats;
    winners: TombolaWinner[];
    nextDrawRank: TombolaRewardRank | null;
    hasParticipantSnapshot: boolean;
  }> {
    return this.http.get<{
      status: number;
      tombola: TombolaItem;
      stats: TombolaStats;
      winners: TombolaWinner[];
      nextDrawRank: TombolaRewardRank | null;
      hasParticipantSnapshot: boolean;
    }>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateTombolaPayload): Observable<{ status: number; tombola: TombolaItem }> {
    return this.http.post<{ status: number; tombola: TombolaItem }>(this.apiUrl, payload);
  }

  open(id: string): Observable<{ status: number; tombola: TombolaItem }> {
    return this.http.post<{ status: number; tombola: TombolaItem }>(`${this.apiUrl}/${id}/open`, {});
  }

  update(
    id: string,
    payload: { title?: string; prizeDescription?: string; status?: TombolaStatus },
  ): Observable<{ status: number; tombola: TombolaItem }> {
    return this.http.patch<{ status: number; tombola: TombolaItem }>(`${this.apiUrl}/${id}`, payload);
  }

  resetAllUserTickets(): Observable<{ status: number; message: string; affectedCount: number }> {
    return this.http.post<{ status: number; message: string; affectedCount: number }>(
      `${this.apiUrl}/reset-tickets`,
      {},
    );
  }

  runDraw(id: string, rank: TombolaRewardRank): Observable<{
    status: number;
    tombola: TombolaItem;
    winner: TombolaWinner;
    rank: TombolaRewardRank;
    remainingDraws: number;
    poolSize: number;
    poolTickets: number;
  }> {
    return this.http.post<{
      status: number;
      tombola: TombolaItem;
      winner: TombolaWinner;
      rank: TombolaRewardRank;
      remainingDraws: number;
      poolSize: number;
      poolTickets: number;
    }>(`${this.apiUrl}/${id}/draw`, { rank });
  }

  getLiveHolders(
    id: string,
    page = 1,
    limit = 20,
    search = '',
  ): Observable<{ status: number; holders: TombolaHolder[]; total: number; page: number; limit: number }> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<{ status: number; holders: TombolaHolder[]; total: number; page: number; limit: number }>(
      `${this.apiUrl}/${id}/holders`,
      { params },
    );
  }

  getWinners(
    id: string,
    page = 1,
    limit = 20,
    search = '',
  ): Observable<{ status: number; winners: TombolaWinner[]; total: number; page: number; limit: number }> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<{ status: number; winners: TombolaWinner[]; total: number; page: number; limit: number }>(
      `${this.apiUrl}/${id}/winners`,
      { params },
    );
  }

  getParticipants(
    id: string,
    page = 1,
    limit = 20,
    search = '',
  ): Observable<{ status: number; participants: TombolaParticipant[]; total: number; page: number; limit: number }> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<{ status: number; participants: TombolaParticipant[]; total: number; page: number; limit: number }>(
      `${this.apiUrl}/${id}/participants`,
      { params },
    );
  }

  remove(id: string): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(`${this.apiUrl}/${id}`);
  }

  createReward(tombolaId: string, form: FormData): Observable<{ status: number; reward: TombolaReward }> {
    return this.http.post<{ status: number; reward: TombolaReward }>(`${this.apiUrl}/${tombolaId}/rewards`, form);
  }

  updateReward(
    tombolaId: string,
    rewardId: string,
    form: FormData,
  ): Observable<{ status: number; reward: TombolaReward }> {
    return this.http.patch<{ status: number; reward: TombolaReward }>(
      `${this.apiUrl}/${tombolaId}/rewards/${rewardId}`,
      form,
    );
  }

  deleteReward(tombolaId: string, rewardId: string): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/${tombolaId}/rewards/${rewardId}`,
    );
  }
}
