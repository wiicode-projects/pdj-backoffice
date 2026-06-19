import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { LegalBlock, LegalDocument, LegalSection } from '../../../core/types/legal-document.types';
import { LegalInlineHtmlPipe } from '../../../core/pipes/legal-inline-html.pipe';

@Component({
  selector: 'pdj-legal-document-preview',
  standalone: true,
  imports: [CommonModule, TranslateModule, LegalInlineHtmlPipe],
  templateUrl: './legal-document-preview.html',
  styleUrl: './legal-document-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDocumentPreviewComponent {
  @Input({ required: true }) document!: LegalDocument;
  @Input() lastUpdate = '';

  blockTrack(_index: number, _block: LegalBlock): number {
    return _index;
  }

  sectionTrack(_index: number, _section: LegalSection): number {
    return _index;
  }
}
