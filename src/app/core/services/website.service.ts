import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
  heroBadgeEnabled: boolean;
  faqSectionEnabled: boolean;
  statsPreview: LandingStatPreview[];
}

export type FaqLocale = 'fr' | 'en' | 'de' | 'it';

export type PageLocale = FaqLocale;

export type LegalDocument = Record<string, unknown>;

export type WebsitePageLocaleContent = {
  document: LegalDocument;
  lastUpdate: string;
};

export type WebsitePageTranslations = Record<PageLocale, WebsitePageLocaleContent>;

export interface WebsitePage {
  id: string;
  slug: 'cgu' | 'cgv' | 'privacy' | 'mentions';
  translations: WebsitePageTranslations;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FaqItemTranslation = {
  question: string;
  answer: string;
};

export type FaqItemTranslations = Record<FaqLocale, FaqItemTranslation>;

export interface FaqItem {
  id: string;
  translations: FaqItemTranslations;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  heroBadgeEnabled?: boolean;
  faqSectionEnabled?: boolean;
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

  findAllFaqItems(): Observable<{ status: number; faqItems: FaqItem[] }> {
    return this.http.get<{ status: number; faqItems: FaqItem[] }>(`${this.url}/faq`);
  }

  createFaqItem(body: {
    translations: FaqItemTranslations;
    isActive?: boolean;
  }): Observable<{ status: number; faqItem: FaqItem }> {
    return this.http.post<{ status: number; faqItem: FaqItem }>(`${this.url}/faq`, body);
  }

  updateFaqItem(
    id: string,
    body: Partial<{ translations: FaqItemTranslations; sortOrder: number; isActive: boolean }>,
  ): Observable<{ status: number; faqItem: FaqItem }> {
    return this.http.patch<{ status: number; faqItem: FaqItem }>(`${this.url}/faq/${id}`, body);
  }

  removeFaqItem(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.url}/faq/${id}`);
  }

  findAllPages(): Observable<{ status: number; pages: WebsitePage[] }> {
    return this.http.get<{ status: number; pages: WebsitePage[] }>(`${this.url}/pages`);
  }

  findPageBySlug(slug: string): Observable<{ status: number; page: WebsitePage }> {
    return this.http.get<{ status: number; page: WebsitePage }>(`${this.url}/pages/admin/${slug}`);
  }

  updatePage(
    slug: string,
    body: Partial<{ translations: Partial<WebsitePageTranslations>; isPublished: boolean }>,
  ): Observable<{ status: number; page: WebsitePage }> {
    return this.http.patch<{ status: number; page: WebsitePage }>(`${this.url}/pages/${slug}`, body);
  }
}
