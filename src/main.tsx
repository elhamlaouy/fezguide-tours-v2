// Ensure window.fetch is writable and has a setter if an interceptor or extension reassigns it
try {
  if (typeof window !== 'undefined') {
    const currentFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : window.fetch;
    let _fetch = currentFetch;
    const propDesc = {
      get: () => _fetch,
      set: (val: any) => {
        _fetch = val;
      },
      configurable: true,
      enumerable: true,
    };
    try {
      Object.defineProperty(window, 'fetch', propDesc);
    } catch {}
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', propDesc);
      } catch {}
    }
  }
} catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './ssr-snapshot.css';

// After a new deploy an open tab can ask for a page chunk that no longer exists. Reload once to pick up the
// current build instead of leaving a broken page; the time guard prevents a reload loop.
window.addEventListener('vite:preloadError', event => {
  try {
    const last = Number(sessionStorage.getItem('fez-chunk-reload') ?? 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem('fez-chunk-reload', String(Date.now()));
  } catch { return; }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(<App />);
