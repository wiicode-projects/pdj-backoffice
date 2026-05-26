import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GameQuizAnswer {
  id: string;
  label: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface GameQuizQuestion {
  id: string;
  category: string;
  question: string;
  isActive: boolean;
  sortOrder: number;
  answers: GameQuizAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface GameQuizRewardTier {
  id: string;
  minCorrectAnswers: number;
  ticketAmount: number;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnswerInput {
  label: string;
  isCorrect: boolean;
  sortOrder?: number;
}

export interface CreateGameQuizQuestionPayload {
  category: string;
  question: string;
  answers: QuizAnswerInput[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateGameQuizRewardTierPayload {
  minCorrectAnswers: number;
  ticketAmount: number;
  label?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class GameQuizService {
  private readonly apiUrl = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  listQuestions(gameId: string): Observable<{
    status: number;
    quizQuestionsPerSession: number;
    quizSecondsPerQuestion: number;
    questions: GameQuizQuestion[];
  }> {
    return this.http.get<{
      status: number;
      quizQuestionsPerSession: number;
      quizSecondsPerQuestion: number;
      questions: GameQuizQuestion[];
    }>(`${this.apiUrl}/settings/${gameId}/quiz-questions`);
  }

  createQuestion(
    gameId: string,
    payload: CreateGameQuizQuestionPayload,
  ): Observable<{ status: number; question: GameQuizQuestion }> {
    return this.http.post<{ status: number; question: GameQuizQuestion }>(
      `${this.apiUrl}/settings/${gameId}/quiz-questions`,
      payload,
    );
  }

  updateQuestion(
    gameId: string,
    questionId: string,
    payload: CreateGameQuizQuestionPayload,
  ): Observable<{ status: number; question: GameQuizQuestion }> {
    return this.http.patch<{ status: number; question: GameQuizQuestion }>(
      `${this.apiUrl}/settings/${gameId}/quiz-questions/${questionId}`,
      payload,
    );
  }

  deleteQuestion(
    gameId: string,
    questionId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/quiz-questions/${questionId}`,
    );
  }

  listRewardTiers(gameId: string): Observable<{
    status: number;
    tiers: GameQuizRewardTier[];
  }> {
    return this.http.get<{ status: number; tiers: GameQuizRewardTier[] }>(
      `${this.apiUrl}/settings/${gameId}/quiz-reward-tiers`,
    );
  }

  createRewardTier(
    gameId: string,
    payload: CreateGameQuizRewardTierPayload,
  ): Observable<{ status: number; tier: GameQuizRewardTier }> {
    return this.http.post<{ status: number; tier: GameQuizRewardTier }>(
      `${this.apiUrl}/settings/${gameId}/quiz-reward-tiers`,
      payload,
    );
  }

  updateRewardTier(
    gameId: string,
    tierId: string,
    payload: CreateGameQuizRewardTierPayload,
  ): Observable<{ status: number; tier: GameQuizRewardTier }> {
    return this.http.patch<{ status: number; tier: GameQuizRewardTier }>(
      `${this.apiUrl}/settings/${gameId}/quiz-reward-tiers/${tierId}`,
      payload,
    );
  }

  deleteRewardTier(
    gameId: string,
    tierId: string,
  ): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(
      `${this.apiUrl}/settings/${gameId}/quiz-reward-tiers/${tierId}`,
    );
  }

  updateQuizConfig(
    gameId: string,
    quizQuestionsPerSession: number,
    quizSecondsPerQuestion: number,
  ): Observable<{
    status: number;
    game: {
      id: string;
      quizQuestionsPerSession: number;
      quizSecondsPerQuestion: number;
    };
  }> {
    return this.http.patch<{
      status: number;
      game: {
        id: string;
        quizQuestionsPerSession: number;
        quizSecondsPerQuestion: number;
      };
    }>(`${this.apiUrl}/settings/${gameId}/quiz-config`, {
      quizQuestionsPerSession,
      quizSecondsPerQuestion,
    });
  }

  static correctAnswerLabel(question: GameQuizQuestion | null): string {
    if (!question?.answers?.length) return '—';
    const correct = question.answers.find((answer) => answer.isCorrect);
    return correct?.label ?? '—';
  }
}
