import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'PAST' | 'CANCELLED';
export type EventCategory = 'PROMOTION' | 'FESTIVAL' | 'WORKSHOP' | 'LAUNCH' | 'PRIVATE' | 'CHALLENGE' | 'SEASONAL';

export interface PlatformEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  status: EventStatus;
  location: string | null;
  startDate: string;
  endDate: string;
  maxAttendees: number;
  currentAttendees: number;
  isFeatured: boolean;
  imageUrl: string | null;
  imageColor: string | null;
  isDeleted: boolean;
  restaurant: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventStats {
  total: number;
  upcoming: number;
  ongoing: number;
  past: number;
  cancelled: number;
  totalAttendees: number;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  category: EventCategory;
  location?: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  isFeatured?: boolean;
  imageUrl?: string;
  imageColor?: string;
  restaurantId?: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload> & {
  status?: EventStatus;
};

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private readonly apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; events: PlatformEvent[] }> {
    return this.http.get<{ status: number; events: PlatformEvent[] }>(this.apiUrl);
  }

  findOne(id: string): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.get<{ status: number; event: PlatformEvent }>(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<{ status: number; stats: EventStats }> {
    return this.http.get<{ status: number; stats: EventStats }>(`${this.apiUrl}/stats`);
  }

  create(payload: CreateEventPayload): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.post<{ status: number; event: PlatformEvent }>(this.apiUrl, payload);
  }

  createWithFormData(fd: FormData): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.post<{ status: number; event: PlatformEvent }>(this.apiUrl, fd);
  }

  update(id: string, payload: UpdateEventPayload): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.patch<{ status: number; event: PlatformEvent }>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ status: number; message: string }> {
    return this.http.delete<{ status: number; message: string }>(`${this.apiUrl}/${id}`);
  }

  toggleFeatured(id: string, isFeatured: boolean): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.patch<{ status: number; event: PlatformEvent }>(`${this.apiUrl}/${id}/featured`, { isFeatured });
  }

  cancel(id: string): Observable<{ status: number; event: PlatformEvent }> {
    return this.http.patch<{ status: number; event: PlatformEvent }>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
