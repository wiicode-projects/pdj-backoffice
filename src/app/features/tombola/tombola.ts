import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { TombolaItem, TombolaService, TombolaStatus } from '../../core/services/tombola.service';

@Component({
  selector: 'pdj-tombola',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './tombola.html',
  styleUrl: './tombola.scss',
})
export class Tombola implements OnInit {
  tombolas: TombolaItem[] = [];
  loading = true;
  showModal = false;
  saving = false;
  saveError = '';

  form = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    title: '',
    prizeDescription: '',
  };

  readonly months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  constructor(
    private tombolaService: TombolaService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.tombolaService.findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => {
          this.tombolas = res.tombolas;
          this.cdr.detectChanges();
        },
      });
  }

  openCreate(): void {
    const now = new Date();
    this.form = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      title: '',
      prizeDescription: '',
    };
    this.saveError = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.saveError = '';

    const payload = {
      year: this.form.year,
      month: this.form.month,
      title: this.form.title.trim() || undefined,
      prizeDescription: this.form.prizeDescription.trim() || undefined,
    };

    this.tombolaService.create(payload)
      .pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => {
          this.showModal = false;
          this.router.navigate(['/app/tombola', res.tombola.id]);
        },
        error: (err) => {
          this.saveError = err?.error?.message ?? 'Erreur lors de la création';
          this.cdr.detectChanges();
        },
      });
  }

  openDetail(item: TombolaItem): void {
    this.router.navigate(['/app/tombola', item.id]);
  }

  deleteItem(item: TombolaItem, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer « ${item.title} » ?`)) return;
    this.tombolaService.remove(item.id).subscribe({
      next: () => this.load(),
    });
  }

  getMonthLabel(month: number): string {
    return this.months.find((m) => m.value === month)?.label ?? String(month);
  }

  getStatusLabel(status: TombolaStatus): string {
    const map: Record<TombolaStatus, string> = {
      DRAFT: 'Brouillon',
      OPEN: 'Ouverte',
      DRAWN: 'Tirée',
    };
    return map[status] ?? status;
  }

  getPeriodLabel(item: TombolaItem): string {
    return `${this.getMonthLabel(item.month)} ${item.year}`;
  }
}
