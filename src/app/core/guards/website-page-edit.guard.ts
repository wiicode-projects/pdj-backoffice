import { CanDeactivateFn } from '@angular/router';
import { WebsitePageEdit } from '../../features/website/pages/website-page-edit';

export const websitePageEditCanDeactivate: CanDeactivateFn<WebsitePageEdit> = (component) => {
  if (!component.canDeactivate) return true;
  return component.canDeactivate();
};
