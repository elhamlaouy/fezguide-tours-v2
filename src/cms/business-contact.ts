import type { CmsDocument } from './schema';
import { DEFAULT_SITE_SETTINGS } from '../data/shared-ui';

/** Keep inherited business targets in sync; custom destinations and query text remain owner-authored. */
export function businessContactHref(document: CmsDocument, href: string): string {
  const digits = (value: string) => value.replace(/\D/g, '');
  const current = document.siteSettings;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/\+?\d+\/?$/.test(url.pathname) && digits(url.pathname) === digits(DEFAULT_SITE_SETTINGS.whatsappNumber)) {
      if (digits(current.whatsappNumber) === digits(DEFAULT_SITE_SETTINGS.whatsappNumber)) return href;
      url.pathname = `/${digits(current.whatsappNumber)}`;
    } else if (url.protocol === 'https:' && url.hostname === 'api.whatsapp.com' && url.pathname === '/send' && digits(url.searchParams.get('phone') ?? '') === digits(DEFAULT_SITE_SETTINGS.whatsappNumber)) {
      if (digits(current.whatsappNumber) === digits(DEFAULT_SITE_SETTINGS.whatsappNumber)) return href;
      url.searchParams.set('phone', digits(current.whatsappNumber));
    } else if (url.protocol === 'tel:' && digits(url.pathname) === digits(DEFAULT_SITE_SETTINGS.phoneNumber)) {
      if (current.phoneNumber === DEFAULT_SITE_SETTINGS.phoneNumber) return href;
      url.pathname = current.phoneNumber;
    } else if (url.protocol === 'mailto:' && url.pathname.toLowerCase() === DEFAULT_SITE_SETTINGS.email.toLowerCase()) {
      if (current.email === DEFAULT_SITE_SETTINGS.email) return href;
      url.pathname = current.email;
    } else return href;
    return url.href;
  } catch { return href; }
}
