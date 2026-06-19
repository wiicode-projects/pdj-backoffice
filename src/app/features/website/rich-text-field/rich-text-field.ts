import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { htmlToInlineText, inlineTextToHtml } from '../../../core/utils/legal-inline-text.util';

@Component({
  selector: 'pdj-rich-text-field',
  standalone: true,
  imports: [FormsModule, QuillEditorComponent],
  template: `
    <quill-editor
      class="rich-text-field"
      theme="snow"
      format="html"
      [modules]="quillModules"
      [placeholder]="placeholder"
      [(ngModel)]="html"
      (ngModelChange)="onHtmlChange($event)"
    />
  `,
  styles: `
    :host {
      display: block;
    }

    .rich-text-field {
      display: block;
      border-radius: 8px;
      overflow: hidden;
    }

    :host ::ng-deep .ql-toolbar.ql-snow {
      border: 1px solid #E5E7EB;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      background: #F9FAFB;
      padding: 8px 10px;
      font-family: inherit;
    }

    :host ::ng-deep .ql-container.ql-snow {
      border: 1px solid #E5E7EB;
      border-radius: 0 0 8px 8px;
      background: #fff;
      font-family: inherit;
      font-size: 0.875rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    :host ::ng-deep .ql-editor {
      min-height: 120px;
      padding: 10px 12px;
      color: #1F2937;
      line-height: 1.55;
    }

    :host ::ng-deep .ql-editor.ql-blank::before {
      color: #9CA3AF;
      font-style: normal;
    }

    :host ::ng-deep .ql-snow .ql-stroke {
      stroke: #6B7280;
    }

    :host ::ng-deep .ql-snow .ql-fill {
      fill: #6B7280;
    }

    :host ::ng-deep .ql-snow.ql-toolbar button:hover,
    :host ::ng-deep .ql-snow .ql-toolbar button:hover {
      color: #DC2626;
    }

    :host ::ng-deep .ql-snow.ql-toolbar button:hover .ql-stroke,
    :host ::ng-deep .ql-snow .ql-toolbar button.ql-active .ql-stroke {
      stroke: #DC2626;
    }

    :host ::ng-deep .rich-text-field:focus-within .ql-toolbar.ql-snow {
      border-color: rgba(220, 38, 38, 0.45);
    }

    :host ::ng-deep .rich-text-field:focus-within .ql-container.ql-snow {
      border-color: rgba(220, 38, 38, 0.45);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextFieldComponent implements OnChanges {
  @Input({ required: true }) value = '';
  @Input() placeholder = '';
  @Output() valueChange = new EventEmitter<string>();

  html = '';

  readonly quillModules = {
    toolbar: [
      ['bold'],
      ['link'],
      ['clean'],
    ],
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.html = inlineTextToHtml(this.value);
    }
  }

  onHtmlChange(html: string): void {
    this.valueChange.emit(htmlToInlineText(html));
  }
}
