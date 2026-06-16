import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Menu } from '../../../core/services/menu.service';
import { MenuCustomerPreview } from '../menu-customer-preview/menu-customer-preview';

@Component({
  selector: 'pdj-menu-preview-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, MenuCustomerPreview],
  templateUrl: './menu-preview-modal.html',
  styleUrl: './menu-preview-modal.scss',
})
export class MenuPreviewModal {
  @Input() open = false;
  @Input() menu: Menu | null = null;
  @Input() submitting = false;
  @Input() isEdit = false;
  @Input() readOnly = false;

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  onClose(): void {
    this.closed.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }
}
