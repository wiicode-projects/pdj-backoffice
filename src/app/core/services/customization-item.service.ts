import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CustomizationCategory =
  | 'color_solid'
  | 'color_gradient'
  | 'color_pattern'
  | 'effect'
  | 'font'
  | 'sticker';

/** Matches mobile cardConfig tabs */
export type CustomizationType = 'couleurs' | 'effets' | 'police' | 'stickers';

export const CUSTOMIZATION_TYPE_CATEGORIES: Record<
  CustomizationType,
  CustomizationCategory[]
> = {
  couleurs: ['color_solid', 'color_gradient', 'color_pattern'],
  effets: ['effect'],
  police: ['font'],
  stickers: ['sticker'],
};

export const CUSTOMIZATION_TYPES: CustomizationType[] = [
  'effets',
  'stickers',
  'couleurs',
  'police',
];

export interface CustomizationItem {
  id: string;
  category: CustomizationCategory;
  itemKey: string;
  name: string;
  description: string | null;
  priceFrites: number;
  isDefaultFree: boolean;
  isActive: boolean;
  sortOrder: number;
  previewImagePath: string | null;
  badgeLabel: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CustomizationItemService {
  private readonly url = `${environment.apiUrl}/shop/customizations`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<{ status: number; items: CustomizationItem[] }> {
    return this.http.get<{ status: number; items: CustomizationItem[] }>(this.url);
  }

  create(form: FormData): Observable<{ status: number; item: CustomizationItem }> {
    return this.http.post<{ status: number; item: CustomizationItem }>(this.url, form);
  }

  update(id: string, form: FormData): Observable<{ status: number; item: CustomizationItem }> {
    return this.http.patch<{ status: number; item: CustomizationItem }>(`${this.url}/${id}`, form);
  }

  remove(id: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.url}/${id}`);
  }

  static categoryLabel(cat: CustomizationCategory): string {
    const map: Record<CustomizationCategory, string> = {
      color_solid: 'Couleur unie',
      color_gradient: 'Dégradé',
      color_pattern: 'Motif',
      effect: 'Effet',
      font: 'Police',
      sticker: 'Sticker',
    };
    return map[cat] ?? cat;
  }

  static typeLabel(type: CustomizationType): string {
    const map: Record<CustomizationType, string> = {
      couleurs: 'Couleurs',
      effets: 'Effets',
      police: 'Police',
      stickers: 'Stickers',
    };
    return map[type];
  }

  static typeForCategory(category: CustomizationCategory): CustomizationType {
    for (const type of CUSTOMIZATION_TYPES) {
      if (CUSTOMIZATION_TYPE_CATEGORIES[type].includes(category)) return type;
    }
    return 'couleurs';
  }
}
