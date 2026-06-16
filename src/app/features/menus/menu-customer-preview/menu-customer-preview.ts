import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Menu } from '../../../core/services/menu.service';
import {
  buildCourseSummary,
  getMenuPreviewImage,
  resolveMenuDisplayName,
} from '../build-draft-menu.util';

@Component({
  selector: 'pdj-menu-customer-preview',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './menu-customer-preview.html',
  styleUrl: './menu-customer-preview.scss',
})
export class MenuCustomerPreview {
  @Input({ required: true }) menu!: Menu;

  get displayName(): string {
    return resolveMenuDisplayName(this.menu.name, this.menu.mainCourse);
  }

  get courseSummary(): string {
    return buildCourseSummary(this.menu);
  }

  get previewImage(): string | null {
    return getMenuPreviewImage(this.menu);
  }

  get restaurantName(): string {
    return this.menu.restaurant?.name ?? '';
  }

  get hasCourses(): boolean {
    return !!(this.menu.appetizer || this.menu.mainCourse || this.menu.dessert);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  formatAvailableDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
  }

  getImageUrl(path: string | null | undefined): string {
    return path || '';
  }
}
