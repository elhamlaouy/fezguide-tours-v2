import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();

const { Window } = await import('happy-dom');
const window = new Window({
  url: 'https://fezguidetours-v2.example.workers.dev/',
  settings: { disableJavaScriptFileLoading: true, handleDisabledFileLoadingAsSuccess: true },
});
for (const [key, value] of [['window', window], ['document', window.document], ['Event', window.Event], ['Element', window.Element], ['localStorage', window.localStorage]]) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

const analytics = await import('../src/analytics.ts');
const gaScripts = () => [...window.document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')];
const pushed = () => (window.dataLayer ?? []).map(entry => [...entry]);

test('Google Analytics stays off on preview hosts and on the production /admin editor', () => {
  analytics.setConsent('granted');
  analytics.initAnalytics();
  analytics.trackPageView();
  assert.equal(analytics.analyticsAvailable(), false);
  assert.equal(gaScripts().length, 0);

  window.localStorage.clear();
  window.happyDOM.setURL('https://fezguidetours.com/admin');
  analytics.setConsent('granted');
  assert.equal(analytics.analyticsAvailable(), false);
  assert.equal(gaScripts().length, 0);
  window.localStorage.clear();
});

test('nothing from Google loads before consent; accepting loads gtag.js and sends the pending page view', () => {
  window.happyDOM.setURL('https://fezguidetours.com/day-trips');
  window.document.title = 'Day Trips';
  analytics.initAnalytics();
  analytics.trackPageView();
  analytics.trackEvent('booking_open');
  assert.equal(analytics.readConsent(), null);
  assert.equal(gaScripts().length, 0);
  assert.equal(window.dataLayer, undefined);

  analytics.setConsent('granted');
  assert.equal(gaScripts().length, 1);
  assert.equal(gaScripts()[0].getAttribute('src'), `https://www.googletagmanager.com/gtag/js?id=${analytics.GA_MEASUREMENT_ID}`);
  const calls = pushed();
  assert.deepEqual(calls.find(call => call[0] === 'consent'), ['consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
  assert.deepEqual(calls.find(call => call[0] === 'config'), ['config', 'G-VM9BWE63RE', { send_page_view: false }]);
  assert.deepEqual(calls.find(call => call[1] === 'page_view'), ['event', 'page_view', { page_location: 'https://fezguidetours.com/day-trips', page_title: 'Day Trips' }]);
  assert.equal(calls.filter(call => call[1] === 'booking_open').length, 0, 'events before consent are dropped, not replayed');
});

test('page views are sent once per location and contact links are tracked', () => {
  const before = pushed().filter(call => call[1] === 'page_view').length;
  analytics.trackPageView();
  window.happyDOM.setURL('https://fezguidetours.com/food-tours');
  analytics.trackPageView();
  analytics.trackPageView();
  assert.equal(pushed().filter(call => call[1] === 'page_view').length, before + 1);

  const cleanup = analytics.installContactClickTracking();
  // Keep the simulated browser on the page (a real browser opens these links elsewhere).
  window.document.addEventListener('click', event => event.preventDefault());
  window.document.body.innerHTML = '<footer><a href="https://wa.me/212719603009">WhatsApp</a><a href="tel:+212">Call</a></footer>';
  for (const link of window.document.querySelectorAll('a')) link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  cleanup();
  const calls = pushed();
  assert.deepEqual(calls.find(call => call[1] === 'whatsapp_click'), ['event', 'whatsapp_click', { method: 'whatsapp', link_area: 'footer' }]);
  assert.deepEqual(calls.find(call => call[1] === 'contact_click'), ['event', 'contact_click', { method: 'phone', link_area: 'footer' }]);
});

test('declining afterwards stops events and clears the _ga cookies', () => {
  window.document.cookie = '_ga=GA1.1.123; path=/';
  analytics.setConsent('denied');
  assert.deepEqual(pushed().at(-1), ['consent', 'update', { analytics_storage: 'denied' }]);
  assert.doesNotMatch(window.document.cookie, /_ga=/);
  const count = pushed().length;
  analytics.trackEvent('booking_submit');
  assert.equal(pushed().length, count);
});
