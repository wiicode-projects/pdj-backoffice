import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AdPosition = 'HOME_BANNER' | 'SEARCH_TOP' | 'HOME_INTERSTITIAL';
export type AdStatus   = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface Ad {
  id: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  targetUrl: string | null;
  position: AdPosition;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdService {
  private readonly url = `${environment.apiUrl}/ads`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; ads: Ad[] }> {
    return this.http.get<{ status: number; ads: Ad[] }>(this.url);
  }

  findOne(id: string): Observable<{ status: number; ad: Ad }> {
    return this.http.get<{ status: number; ad: Ad }>(`${this.url}/${id}`);
  }

  create(form: FormData): Observable<{ status: number; ad: Ad }> {
    return this.http.post<{ status: number; ad: Ad }>(this.url, form);
  }

  update(id: string, form: FormData): Observable<{ status: number; ad: Ad }> {
    return this.http.patch<{ status: number; ad: Ad }>(`${this.url}/${id}`, form);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.url}/${id}`);
  }
}
