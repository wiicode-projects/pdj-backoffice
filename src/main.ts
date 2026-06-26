import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/** After a deploy, cached main.js may reference removed lazy chunks — reload once. */
const CHUNK_RELOAD_KEY = 'pdj-chunk-reload';
window.addEventListener('unhandledrejection', (event) => {
  const message = String((event.reason as Error)?.message ?? event.reason ?? '');
  if (!message.includes('Failed to fetch dynamically imported module')) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});

bootstrapApplication(App, appConfig)
  .then(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY))
  .catch((err) => console.error(err));
