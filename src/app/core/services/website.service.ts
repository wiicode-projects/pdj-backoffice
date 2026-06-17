import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LandingStatPreview {
  key: 'downloads' | 'restaurants' | 'menusServed' | 'averageRating';
  val: number;
  suffix: string;
  isDecimal: boolean;
}

export interface WebsiteSettings {
  statsSectionEnabled: boolean;
  testimonialsSectionEnabled: boolean;
  statsPreview: LandingStatPreview[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  imagePath: string | null;
  imageUrl: string | null;
  rating: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateVisibilityDto {
  statsSectionEnabled?: boolean;
  testimonialsSectionEnabled?: boolean;
}

export interface UpdateStatsDto {
  statsDownloads: number;
  statsRestaurants: number;
  statsMenusServed: number;
  statsAverageRating: number;
}

@Injectable({ providedIn: 'root' })
export class WebsiteService {
  private readonly url = `${environment.apiUrl}/website`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<WebsiteSettings> {
    return this.http.get<WebsiteSettings>(`${this.url}/settings`);
  }

  updateVisibility(dto: UpdateVisibilityDto): Observable<WebsiteSettings> {
    return this.http.patch<WebsiteSettings>(`${this.url}/settings/visibility`, dto);
  }

  updateStats(dto: UpdateStatsDto): Observable<WebsiteSettings> {
    return this.http.patch<WebsiteSettings>(`${this.url}/settings/stats`, dto);
  }

  syncStatsFromDatabase(): Observable<WebsiteSettings> {
    return this.http.post<WebsiteSettings>(`${this.url}/settings/stats/sync`, {});
  }

  findAllTestimonials(): Observable<{ status: number; testimonials: Testimonial[] }> {
    return this.http.get<{ status: number; testimonials: Testimonial[] }>(`${this.url}/testimonials`);
  }

  create(form: FormData): Observable<{ status: number; testimonial: Testimonial }> {
    return this.http.post<{ status: number; testimonial: Testimonial }>(`${this.url}/testimonials`, form);
  }

  update(id: string, form: FormData): Observable<{ status: number; testimonial: Testimonial }> {
    return this.http.patch<{ status: number; testimonial: Testimonial }>(`${this.url}/testimonials/${id}`, form);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.url}/testimonials/${id}`);
  }
}
