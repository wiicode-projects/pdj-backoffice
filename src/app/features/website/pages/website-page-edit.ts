import { Component, OnInit, ChangeDetectorRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import {
  WebsiteService,
  WebsitePage,
  WebsitePageTranslations,
  PageLocale,
} from '../../../core/services/website.service';
import {
  LegalDocument,
  emptyLegalDocument,
  parseLegalDocument,
  cloneLegalDocument,
} from '../../../core/types/legal-document.types';
import {
  isWebsitePageSlug,
  WEBSITE_PAGE_PUBLIC_PATHS,
  WebsitePageSlug,
} from '../../../core/utils/website-page-paths';
import { LegalDocumentEditorComponent } from '../legal-document-editor/legal-document-editor';
import { LegalDocumentPreviewComponent } from '../legal-document-preview/legal-document-preview';

export type PageEditViewMode = 'edit' | 'preview' | 'split';

@Component({
  selector: 'pdj-website-page-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterLink,
    LegalDocumentEditorComponent,
    LegalDocumentPreviewComponent,
  ],
  templateUrl: './website-page-edit.html',
  styleUrl: './website-page-edit.scss',
})
export class WebsitePageEdit implements OnInit {
  @ViewChild(LegalDocumentEditorComponent) pageEditor?: LegalDocumentEditorComponent;

  slug: WebsitePageSlug | null = null;
  page: WebsitePage | null = null;
  loading = true;
  loadError = '';
  saving = false;
  saveError = '';
  saveSuccess = false;
  dirty = false;

  isPublished = false;
  activeLocale: PageLocale = 'fr';
  viewMode: PageEditViewMode = 'split';

  lastUpdate: Record<PageLocale, string> = this.emptyLastUpdates();
  documents: Record<PageLocale, LegalDocument> = this.emptyDocuments();

  readonly locales: { code: PageLocale; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
  ];

  readonly viewModes: PageEditViewMode[] = ['edit', 'split', 'preview'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private websiteService: WebsiteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const slugParam = this.route.snapshot.paramMap.get('slug') ?? '';
    if (!isWebsitePageSlug(slugParam)) {
      void this.router.navigate(['/app/website']);
      return;
    }
    this.slug = slugParam;
    this.loadPage();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      this.save();
    }
  }

  get previewDocument(): LegalDocument {
    return this.documents[this.activeLocale];
  }

  get publicSitePath(): string | null {
    if (!this.slug) return null;
    return WEBSITE_PAGE_PUBLIC_PATHS[this.slug];
  }

  private emptyLastUpdates(): Record<PageLocale, string> {
    return { fr: '', en: '', de: '', it: '' };
  }

  private emptyDocuments(): Record<PageLocale, LegalDocument> {
    return {
      fr: emptyLegalDocument(),
      en: emptyLegalDocument(),
      de: emptyLegalDocument(),
      it: emptyLegalDocument(),
    };
  }

  loadPage(): void {
    if (!this.slug) return;
    this.loading = true;
    this.loadError = '';

    this.websiteService.findPageBySlug(this.slug)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.applyPage(res.page);
          this.dirty = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loadError = this.readApiError(err, 'Impossible de charger la page.');
          this.cdr.detectChanges();
        },
      });
  }

  private applyPage(page: WebsitePage): void {
    this.page = page;
    this.isPublished = page.isPublished;
    for (const { code } of this.locales) {
      this.lastUpdate[code] = page.translations[code].lastUpdate;
      this.documents[code] = parseLegalDocument(page.translations[code].document);
    }
  }

  setActiveLocale(code: PageLocale): void {
    this.syncCurrentDocument();
    this.activeLocale = code;
    this.cdr.detectChanges();
  }

  setViewMode(mode: PageEditViewMode): void {
    if (mode !== 'edit') this.syncCurrentDocument();
    this.viewMode = mode;
    this.cdr.detectChanges();
  }

  onEditorChange(): void {
    this.syncCurrentDocument();
    this.dirty = true;
    this.saveSuccess = false;
    this.cdr.detectChanges();
  }

  onMetaChange(): void {
    this.dirty = true;
    this.saveSuccess = false;
  }

  syncCurrentDocument(): void {
    if (this.pageEditor?.doc) {
      this.documents[this.activeLocale] = cloneLegalDocument(this.pageEditor.doc);
    }
  }

  togglePublished(): void {
    if (!this.slug || this.saving) return;
    const nextPublished = !this.isPublished;
    this.isPublished = nextPublished;
    this.dirty = true;
    this.saveError = '';
    this.saveSuccess = false;
    this.saving = true;
    this.cdr.detectChanges();

    this.websiteService.updatePage(this.slug, { isPublished: nextPublished })
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.applyPage(res.page);
          this.dirty = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.isPublished = !nextPublished;
          this.saveError = this.readApiError(err, 'Publication impossible.');
          this.cdr.detectChanges();
        },
      });
  }

  save(): void {
    if (!this.slug || this.saving) return;
    this.syncCurrentDocument();
    this.saveError = '';
    this.saveSuccess = false;

    const translations: Partial<WebsitePageTranslations> = {};
    for (const { code } of this.locales) {
      const doc = this.documents[code];
      if (!doc.meta.title.trim()) {
        this.saveError = `Titre manquant (${code.toUpperCase()})`;
        this.activeLocale = code;
        this.cdr.detectChanges();
        return;
      }
      translations[code] = {
        lastUpdate: this.lastUpdate[code],
        document: doc as unknown as WebsitePageTranslations[PageLocale]['document'],
      };
    }

    this.saving = true;
    this.websiteService.updatePage(this.slug, {
      translations,
      isPublished: this.isPublished,
    }).pipe(finalize(() => {
      this.saving = false;
      this.cdr.detectChanges();
    })).subscribe({
      next: (res) => {
        this.applyPage(res.page);
        this.dirty = false;
        this.saveSuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.saveSuccess = false;
          this.cdr.detectChanges();
        }, 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.saveError = this.readApiError(err, 'Enregistrement impossible.');
        this.cdr.detectChanges();
      },
    });
  }

  private readApiError(err: HttpErrorResponse, fallback: string): string {
    const body = err.error;
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
    if (typeof body?.message === 'string') {
      return body.message;
    }
    return fallback;
  }

  canDeactivate(): boolean {
    if (!this.dirty) return true;
    return confirm('Modifications non enregistrées. Quitter quand même ?');
  }
}
