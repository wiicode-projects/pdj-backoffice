import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { NotificationsService, AppNotification } from '../../core/services/notifications.service';

@Component({
  selector: 'pdj-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
  loading = true;
  notifications: AppNotification[] = [];
  error = '';

  constructor(
    private notificationsService: NotificationsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationsService.findMine()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.notifications = res.notifications || [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'NOTIFICATIONS.LOAD_ERROR';
          this.cdr.detectChanges();
        },
      });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('fr-CH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
