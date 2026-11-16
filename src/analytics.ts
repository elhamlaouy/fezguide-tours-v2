/**
 * Google Analytics 4, loaded only after the visitor accepts analytics cookies.
 *
 * - Nothing from Google loads (no script, no cookie, no request) until consent is "granted".
 * - Only runs on the public production hosts, never on /admin, the editor host, previews or localhost.
 * - No inline script: this module is part of the app bundle (CSP script-src 'self');
 *   gtag.js itself comes from www.googletagmanager.com, which the CSP allows.
 * - Page views are sent by the app router (see App.tsx). In GA, turn OFF
 *   Admin > Data streams > Enhanced measurement > "Page changes based on browser history events"
 *   so client-side navigations are not counted twice.
 */

export const GA_MEASUREMENT_ID = 'G-VM9BWE63RE';
const PRODUCTION_HOSTS = new Set(['fezguidetours.com', 'www.fezguidetours.com']);
const CONSENT_KEY = 'fgt-analytics-consent';
export const CONSENT_OPEN_EVENT = 'fgt-open-consent';

export type ConsentChoice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;
let lastPageView = '';
let pendingPage: { location: string; title: string } | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isAdminLocation(): boolean {
  const { pathname, hostname } = window.location;
  return pathname === '/admin' || pathname.startsWith('/admin/') || hostname.startsWith('app.');
}

/** True where the consent banner and GA should exist at all. */
export function analyticsAvailable(): boolean {
  return isBrowser() && PRODUCTION_HOSTS.has(window.location.hostname) && !isAdminLocation();
}

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function storeConsent(choice: ConsentChoice): void {
  try { window.localStorage.setItem(CONSENT_KEY, choice); } catch { /* private mode: choice lasts for this page only */ }
}

function loadGtag(): void {
  if (loaded || !analyticsAvailable()) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the real `arguments` object, not an array.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  if (pendingPage) sendPageView(pendingPage.location, pendingPage.title);
}

function deleteGaCookies(): void {
  const host = window.location.hostname.replace(/^www\./, '');
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^_ga/.test(name)) continue;
    for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

export function setConsent(choice: ConsentChoice): void {
  if (!isBrowser()) return;
  storeConsent(choice);
  if (choice === 'granted') {
    if (loaded && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'granted' });
    else loadGtag();
    return;
  }
  if (loaded && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  deleteGaCookies();
}

/** Call once at startup: loads GA straight away for visitors who already accepted. */
export function initAnalytics(): void {
  if (analyticsAvailable() && readConsent() === 'granted') loadGtag();
}

/** Re-open the consent banner (footer "Cookie settings" link). */
export function openConsentSettings(): void {
  if (isBrowser()) window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function sendPageView(location: string, title: string): void {
  if (!window.gtag || location === lastPageView) return;
  lastPageView = location;
  window.gtag('event', 'page_view', { page_location: location, page_title: title });
}

export function trackPageView(): void {
  if (!analyticsAvailable()) return;
  const location = window.location.href;
  const title = document.title;
  if (loaded && readConsent() === 'granted') sendPageView(location, title);
  else pendingPage = { location, title };
}

type EventParams = Record<string, string | number | undefined>;

/** Send a GA4 event. Never pass personal data (names, emails, phone numbers, free-text notes). */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (!loaded || !window.gtag || readConsent() !== 'granted' || !analyticsAvailable()) return;
  window.gtag('event', name, params);
}

const CONTACT_LINK = /^(?:https:\/\/(?:wa\.me|api\.whatsapp\.com)\/|tel:|mailto:)/i;

/**
 * One listener for every WhatsApp / phone / email link on the site, including CMS-rendered ones.
 * Returns a cleanup function.
 */
export function installContactClickTracking(): () => void {
  if (!isBrowser()) return () => {};
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    const href = target?.getAttribute('href') ?? '';
    if (!CONTACT_LINK.test(href)) return;
    const method = href.startsWith('tel:') ? 'phone' : href.startsWith('mailto:') ? 'email' : 'whatsapp';
    const area = target?.closest('[role="dialog"]') ? 'booking_dialog'
      : target?.closest('footer') ? 'footer'
      : target?.closest('nav, header') ? 'navbar'
      : 'page';
    trackEvent(method === 'whatsapp' ? 'whatsapp_click' : 'contact_click', { method, link_area: area });
  };
  document.addEventListener('click', onClick, { capture: true });
  return () => document.removeEventListener('click', onClick, { capture: true });
}
