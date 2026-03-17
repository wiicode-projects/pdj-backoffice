import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'pdj-users',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page">
      <h1 class="page__title">{{ 'USERS.TITLE' | translate }}</h1>
    </div>
  `,
  styles: [`
    .page { font-family: 'PolySans Trial', -apple-system, sans-serif; }
    .page__title { font-size: 1.6rem; font-weight: 700; color: #1F2937; }
  `],
})
export class Users {}
