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

createRoot(document.getElementById('root')!).render(<App />);
