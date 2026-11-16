import React, { useEffect, useState } from 'react';
import type { Language } from '../types';
import { analyticsAvailable, CONSENT_OPEN_EVENT, readConsent, setConsent, type ConsentChoice } from '../analytics';

const COPY: Record<Language, { title: string; body: string; accept: string; decline: string }> = {
  en: {
    title: 'Cookies & analytics',
    body: 'We use Google Analytics cookies to understand how visitors use our site, so we can improve our tours and pages. No advertising cookies. You can change your choice any time via “Cookie settings” in the footer.',
    accept: 'Accept',
    decline: 'Decline',
  },
  fr: {
    title: 'Cookies et statistiques',
    body: 'Nous utilisons les cookies Google Analytics pour comprendre comment les visiteurs utilisent notre site et améliorer nos visites. Aucun cookie publicitaire. Vous pouvez modifier votre choix à tout moment via « Paramètres des cookies » en bas de page.',
    accept: 'Accepter',
    decline: 'Refuser',
  },
  es: {
    title: 'Cookies y estadísticas',
    body: 'Usamos cookies de Google Analytics para entender cómo se utiliza nuestra web y mejorar nuestras visitas. No usamos cookies publicitarias. Puedes cambiar tu elección en cualquier momento en «Configuración de cookies», al pie de la página.',
    accept: 'Aceptar',
    decline: 'Rechazar',
  },
};

export const COOKIE_SETTINGS_LABEL: Record<Language, string> = {
  en: 'Cookie settings',
  fr: 'Paramètres des cookies',
  es: 'Configuración de cookies',
};

export const CookieConsent: React.FC<{ language: Language }> = ({ language }) => {
  const [open, setOpen] = useState(() => analyticsAvailable() && readConsent() === null);

  useEffect(() => {
    const reopen = () => { if (analyticsAvailable()) setOpen(true); };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;
  const t = COPY[language] ?? COPY.en;
  const choose = (choice: ConsentChoice) => { setConsent(choice); setOpen(false); };

  return (
    <div
      role="region"
      aria-label={t.title}
      className="fixed z-[45] left-4 right-4 bottom-24 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm bg-white text-[#1C2524] rounded-2xl shadow-2xl border border-[#E7E2DA] p-5"
    >
      <p className="font-bold text-sm">{t.title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#52605E]">{t.body}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="flex-1 py-2.5 px-4 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] hover:bg-[#F2ECE4] text-xs font-bold transition-colors cursor-pointer"
        >
          {t.decline}
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="flex-1 py-2.5 px-4 rounded-xl bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold transition-colors cursor-pointer"
        >
          {t.accept}
        </button>
      </div>
    </div>
  );
};
