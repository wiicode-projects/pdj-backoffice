import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  LegalBlock,
  LegalDocument,
  LegalSection,
  cloneLegalDocument,
} from '../../../core/types/legal-document.types';
import { RichTextFieldComponent } from '../rich-text-field/rich-text-field';

type BlockKind = LegalBlock['kind'];

@Component({
  selector: 'pdj-legal-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RichTextFieldComponent],
  templateUrl: './legal-document-editor.html',
  styleUrl: './legal-document-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDocumentEditorComponent {
  @Input({ required: true })
  set document(value: LegalDocument) {
    this.doc = cloneLegalDocument(value);
    this.showToc = Boolean(value.toc);
    this.cdr.markForCheck();
  }

  @Output() documentChange = new EventEmitter<void>();

  doc!: LegalDocument;
  showToc = false;

  readonly blockKinds: BlockKind[] = [
    'p',
    'h3',
    'ul',
    'ol',
    'callout',
    'table',
    'card',
    'cards',
    'keyValue',
    'hr',
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  emitChange(): void {
    this.documentChange.emit();
    this.cdr.markForCheck();
  }

  onTocToggle(): void {
    if (this.showToc && !this.doc.toc) {
      this.doc.toc = { label: '', items: [''] };
    }
    if (!this.showToc) {
      this.doc.toc = undefined;
    }
    this.emitChange();
  }

  addTocItem(): void {
    if (!this.doc.toc) return;
    this.doc.toc.items.push('');
    this.emitChange();
  }

  removeTocItem(index: number): void {
    if (!this.doc.toc) return;
    this.doc.toc.items.splice(index, 1);
    if (this.doc.toc.items.length === 0) this.doc.toc.items.push('');
    this.emitChange();
  }

  addSection(): void {
    this.doc.sections.push({ title: '', blocks: [{ kind: 'p', text: '' }] });
    this.emitChange();
  }

  removeSection(index: number): void {
    this.doc.sections.splice(index, 1);
    this.emitChange();
  }

  moveSection(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.doc.sections.length) return;
    const [section] = this.doc.sections.splice(index, 1);
    this.doc.sections.splice(target, 0, section);
    this.emitChange();
  }

  addBlock(section: LegalSection, kind: string): void {
    section.blocks.push(this.createBlock(kind as BlockKind));
    this.emitChange();
  }

  removeBlock(section: LegalSection, index: number): void {
    section.blocks.splice(index, 1);
    this.emitChange();
  }

  moveBlock(section: LegalSection, index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= section.blocks.length) return;
    const [block] = section.blocks.splice(index, 1);
    section.blocks.splice(target, 0, block);
    this.emitChange();
  }

  blockLabel(block: LegalBlock): string {
    return `WEBSITE.LEGAL_BLOCK_${block.kind.toUpperCase()}`;
  }

  addListItem(block: Extract<LegalBlock, { kind: 'ul' | 'ol' }>): void {
    block.items.push('');
    this.emitChange();
  }

  removeListItem(block: Extract<LegalBlock, { kind: 'ul' | 'ol' }>, index: number): void {
    block.items.splice(index, 1);
    if (block.items.length === 0) block.items.push('');
    this.emitChange();
  }

  addTableRow(block: Extract<LegalBlock, { kind: 'table' }>): void {
    block.rows.push(block.headers.map(() => ''));
    this.emitChange();
  }

  removeTableRow(block: Extract<LegalBlock, { kind: 'table' }>, index: number): void {
    block.rows.splice(index, 1);
    this.emitChange();
  }

  onTableHeaderChange(block: Extract<LegalBlock, { kind: 'table' }>): void {
    const colCount = block.headers.length;
    for (const row of block.rows) {
      while (row.length < colCount) row.push('');
      while (row.length > colCount) row.pop();
    }
    this.emitChange();
  }

  addCard(block: Extract<LegalBlock, { kind: 'cards' }>): void {
    block.items.push({ title: '', text: '' });
    this.emitChange();
  }

  removeCard(block: Extract<LegalBlock, { kind: 'cards' }>, index: number): void {
    block.items.splice(index, 1);
    this.emitChange();
  }

  addKeyValue(block: Extract<LegalBlock, { kind: 'keyValue' }>): void {
    block.items.push({ label: '', value: '' });
    this.emitChange();
  }

  removeKeyValue(block: Extract<LegalBlock, { kind: 'keyValue' }>, index: number): void {
    block.items.splice(index, 1);
    this.emitChange();
  }

  parsePipeSeparated(value: string): string[] {
    return value.split('|').map((part) => part.trim());
  }

  formatPipeSeparated(values: string[]): string {
    return values.join(' | ');
  }

  onTableHeadersInput(block: Extract<LegalBlock, { kind: 'table' }>, value: string): void {
    block.headers = this.parsePipeSeparated(value);
    this.onTableHeaderChange(block);
  }

  onTableRowInput(block: Extract<LegalBlock, { kind: 'table' }>, rowIndex: number, value: string): void {
    block.rows[rowIndex] = this.parsePipeSeparated(value);
    this.emitChange();
  }

  onPricingHeadersInput(block: Extract<LegalBlock, { kind: 'subscriptionPricingTable' }>, value: string): void {
    block.headers = this.parsePipeSeparated(value);
    this.emitChange();
  }

  private createBlock(kind: BlockKind): LegalBlock {
    switch (kind) {
      case 'p':
        return { kind: 'p', text: '' };
      case 'h3':
        return { kind: 'h3', text: '' };
      case 'ul':
      case 'ol':
        return { kind, items: [''] };
      case 'callout':
        return { kind: 'callout', variant: 'info', text: '' };
      case 'table':
        return { kind: 'table', headers: ['', ''], rows: [['', '']] };
      case 'card':
        return { kind: 'card', title: '', text: '' };
      case 'cards':
        return { kind: 'cards', items: [{ title: '', text: '' }] };
      case 'keyValue':
        return { kind: 'keyValue', items: [{ label: '', value: '' }] };
      case 'hr':
        return { kind: 'hr' };
      default:
        return { kind: 'p', text: '' };
    }
  }
}
