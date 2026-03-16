import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'pdj-dashboard',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="dashboard-placeholder">
      <h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>
      <p>{{ 'COMMON.WELCOME' | translate }} 🎉</p>
    </div>
  `,
  styles: [
    `
      .dashboard-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #0f0f1a;
        color: #fff;
        font-family: 'PolySans Trial', sans-serif;

        h1 {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        p {
          color: rgba(255, 255, 255, 0.6);
        }
      }
    `,
  ],
})
export class Dashboard {}
