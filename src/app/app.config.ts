import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateHttpLoader({
      prefix: './i18n/',
      suffix: `.json?v=${Date.now()}`,
    }),
    provideTranslateService({
      defaultLanguage: 'fr',
      loader: { provide: TranslateLoader, useClass: TranslateHttpLoader },
    }),
    provideQuillConfig({}),
  ],
};
