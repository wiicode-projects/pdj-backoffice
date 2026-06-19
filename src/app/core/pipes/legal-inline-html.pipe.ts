import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inlineTextToHtml } from '../utils/legal-inline-text.util';

@Pipe({
  name: 'legalInlineHtml',
  standalone: true,
})
export class LegalInlineHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(text: string | null | undefined): SafeHtml {
    if (!text) return '';
    const html = inlineTextToHtml(text).replace(/^<p>|<\/p>$/g, '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
