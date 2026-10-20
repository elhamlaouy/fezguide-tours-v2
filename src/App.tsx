/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Language, PageId, SectionPillar } from './types';
import { CmsProvider, useCms } from './context/CmsContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { DetailModal } from './components/DetailModal';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import type { CmsDocument } from './cms/schema';
import { approvedThemeActive } from './cms/approved-content';
import { PageRenderer } from './cms/PageRenderer';
import { pageLocaleAvailable, themeStyle } from './cms/render-utils';
import './cms/site-theme.css';
import { pagePath, resolveRoute } from './cms/routing';
import { applyRouteSeo } from './cms/seo';
import { isAdminPath, loadAdminApp, publishedPage, requiresDocumentNavigation, snapshotContainsRoute, type AdminAppComponent } from './cms/public-document';

// Pages
import { HomePage } from './pages/HomePage';
const FezPage = React.lazy(() => import('./pages/FezPage').then(module => ({ default: module.FezPage })));
const DayTripsPage = React.lazy(() => import('./pages/DayTripsPage').then(module => ({ default: module.DayTripsPage })));
const FoodToursPage = React.lazy(() => import('./pages/FoodToursPage').then(module => ({ default: module.FoodToursPage })));
const TravelTipsPage = React.lazy(() => import('./pages/TravelTipsPage').then(module => ({ default: module.TravelTipsPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const BlogPage = React.lazy(() => import('./pages/BlogPage').then(module => ({ default: module.BlogPage })));
const CustomPageRenderer = React.lazy(() => import('./pages/CustomPageRenderer').then(module => ({ default: module.CustomPageRenderer })));
const MedinaArticlePage = React.lazy(() => import('./pages/MedinaArticlePage').then(module => ({ default: module.MedinaArticlePage })));
const HistoryCultureArticlePage = React.lazy(() => import('./pages/HistoryCultureArticlePage').then(module => ({ default: module.HistoryCultureArticlePage })));
const ThingsToDoArticlePage = React.lazy(() => import('./pages/ThingsToDoArticlePage').then(module => ({ default: module.ThingsToDoArticlePage })));
const OurFezToursPage = React.lazy(() => import('./pages/OurFezToursPage').then(module => ({ default: module.OurFezToursPage })));
// The legacy editorial library is only needed when no published CMS document exists.
const LegacyEditorialPage = React.lazy(async () => {
  const [{ EditorialArticlePage }, { editorialArticleById }, { ExperienceDetailPage }] = await Promise.all([
    import('./components/EditorialArticlePage'), import('./data/editorialArticles'), import('./pages/ExperienceDetailPage'),
  ]);
  return { default: ({ pillar, language, onNavigate, onExplore, onBook }: {
    pillar: SectionPillar; language: Language; onNavigate: (page: PageId) => void;
    onExplore: (productId: string) => void; onBook: (title?: string) => void;
  }) => {
    const article = editorialArticleById(pillar.id);
    return article?.template === 'editorial-guide' ? <EditorialArticlePage article={article} language={language}
      onBack={() => onNavigate(pillar.pageId)} onNavigate={onNavigate}
      onOpenProduct={() => { if (article.productId) onExplore(article.productId); }} /> : <ExperienceDetailPage pillar={pillar} language={language} onNavigate={onNavigate} onSelectExperience={item => onExplore(item.id)} onBookTour={onBook} />;
  } };
});

function readPathname(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

export function PublicPageSwitch({
  document,
  pageId,
  experienceId,
  language,
  onNavigate,
  onBook,
  legacy,
}: {
  document: CmsDocument | null;
  pageId: string;
  experienceId?: string;
  language: Language;
  onNavigate: (pageId: string) => void;
  onBook: (productId: string) => void;
  legacy: React.ReactNode;
}) {
  const page = document ? publishedPage(document, pageId, experienceId) : undefined;
  if (!document) return legacy;
  if (!page || !pageLocaleAvailable(document, page, language)) return <section className="cms-page-header" role="status"><h1>404 — {language === 'fr' ? 'Page introuvable' : language === 'es' ? 'Página no encontrada' : 'Page not found'}</h1></section>;
  // Never render a summary-only body as a deliberate deletion while leaving a scope.
  if (!snapshotContainsRoute(document, { pageId, page, language })) return <p role="status">{language === 'fr' ? 'Chargement…' : language === 'es' ? 'Cargando…' : 'Loading…'}</p>;
  return (
    <PageRenderer
      document={document}
      page={page}
      language={language}
      onNavigate={onNavigate}
      onBook={onBook}
    />
  );
}

function AppContent() {
  const { tours, customPages, publishedDocument } = useCms();
  const [currentPage, setCurrentPage] = useState<PageId>(() => typeof window === 'undefined' ? 'home' : resolveRoute(new URL(window.location.href), publishedDocument).pageId);
  const [language, setLanguage] = useState<Language>(() => typeof window === 'undefined' ? 'en' : resolveRoute(new URL(window.location.href), publishedDocument).language);
  const [selectedExperience, setSelectedExperience] = useState<SectionPillar | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<SectionPillar | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingTourTitle, setBookingTourTitle] = useState<string>('');
  const [pathname, setPathname] = useState(readPathname);
  const [AdminApp, setAdminApp] = useState<AdminAppComponent | null>();
  const admin = isAdminPath(pathname);
  const lastLocation = useRef(typeof window === 'undefined' ? '/' : window.location.href);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    void loadAdminApp().then((loaded) => {
      if (!cancelled) setAdminApp(() => loaded?.AdminApp ?? null);
    });
    return () => { cancelled = true; };
  }, [admin]);

  // All supported website locales use left-to-right text.
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  useEffect(() => {
    const syncLocation = (event?: PopStateEvent) => {
      if (event && !window.dispatchEvent(new window.Event('cms-before-navigation', { cancelable: true }))) {
        window.history.pushState(null, '', lastLocation.current);
        return;
      }
      const url = new URL(window.location.href);
      if (requiresDocumentNavigation(publishedDocument, url)) {
        // A history traversal must replace this entry, not create a Back/Forward loop.
        window.location.replace(url.href);
        return;
      }
      const route = resolveRoute(url, publishedDocument);
      setPathname(readPathname());
      setLanguage(route.language);
      const experience = tours.find(tour => tour.id === (route.experienceId ?? route.page?.id ?? route.pageId));
      setSelectedExperience(experience ?? null);
      setCurrentPage(!publishedDocument && experience ? 'experience-detail' : route.pageId);
      if (route.redirect) window.history.replaceState(null, '', route.redirect);
      lastLocation.current = window.location.href;
    };
    syncLocation();
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, [publishedDocument, tours]);

  useEffect(() => {
    if (!admin && publishedDocument) applyRouteSeo(document, publishedDocument, resolveRoute(new URL(window.location.href), publishedDocument));
  }, [admin, publishedDocument, currentPage, language, pathname]);

  const handleOpenBooking = (tourId?: string, tourTitle?: string) => {
    setBookingTourTitle(tourTitle || '');
    setBookingModalOpen(true);
  };

  const navigate = (key: string, nextLanguage = language, experience?: SectionPillar) => {
    const path = pagePath(publishedDocument, key, nextLanguage);
    const url = new URL(window.location.href);
    url.pathname = path;
    for (const key of ['page', 'experience', 'tour', 'lang', 'language']) url.searchParams.delete(key);
    url.hash = '';
    if (requiresDocumentNavigation(publishedDocument, url)) {
      // ponytail: ordinary Worker HTML preserves one publication revision per response;
      // no extra API, partial-document merge, or client-side revision state machine.
      window.location.assign(`${url.pathname}${url.search}`);
      return;
    }
    window.history.pushState(null, '', `${url.pathname}${url.search}`);
    lastLocation.current = window.location.href;
    setPathname(url.pathname);
    setLanguage(nextLanguage);
    setSelectedExperience(experience ?? null);
    setCurrentPage(!publishedDocument && experience ? 'experience-detail' : key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExplorePillar = (pillar: SectionPillar) => navigate(pillar.id, language, pillar);
  const handleNavigatePage = (pageId: PageId) => navigate(pageId);
  const handleLanguageChange = (nextLanguage: Language) => navigate(selectedExperience?.id ?? currentPage, nextLanguage, selectedExperience ?? undefined);

  const handleBookFromPillar = (tourTitle?: string) => {
    setDetailModalOpen(false);
    setBookingTourTitle(tourTitle || '');
    setBookingModalOpen(true);
  };

  const handleCmsBook = (productId: string) => {
    const product = publishedDocument?.products.find((item) => item.id === productId);
    handleOpenBooking(productId, product?.title[language] || (language === 'es' ? '' : product?.title.en || ''));
  };

  const closeAdmin = () => {
    if (typeof window !== 'undefined') navigate('home');
  };

  const renderLegacyPage = () => {
    // 0. Dedicated Product / Experience Detail Page
    if (currentPage === 'experience-detail' && selectedExperience) {
      if (selectedExperience.id === 'fez-explore-medina') {
        return (
          <MedinaArticlePage
            language={language}
            onBack={() => handleNavigatePage('fez')}
            onNavigate={handleNavigatePage}
            onExploreTours={() => {
              const fezTours = tours.find((tour) => tour.id === 'our-fez-tours');
              if (fezTours) handleExplorePillar(fezTours);
            }}
          />
        );
      }

      if (selectedExperience.id === 'fez-history-landmarks') {
        return (
          <HistoryCultureArticlePage
            language={language}
            onBack={() => handleNavigatePage('fez')}
            onNavigate={handleNavigatePage}
            onExploreTours={() => {
              const fezTours = tours.find((tour) => tour.id === 'our-fez-tours');
              if (fezTours) handleExplorePillar(fezTours);
            }}
          />
        );
      }

      if (selectedExperience.id === 'fez-things-to-do') {
        return (
          <ThingsToDoArticlePage
            language={language}
            onBack={() => handleNavigatePage('fez')}
            onNavigate={handleNavigatePage}
            onExploreTours={() => {
              const fezTours = tours.find((tour) => tour.id === 'our-fez-tours');
              if (fezTours) handleExplorePillar(fezTours);
            }}
          />
        );
      }

      if (selectedExperience.id === 'our-fez-tours') {
        return (
          <OurFezToursPage
            language={language}
            onBack={() => handleNavigatePage('fez')}
            onNavigate={handleNavigatePage}
            onBookTour={handleBookFromPillar}
          />
        );
      }

      return (
        <LegacyEditorialPage pillar={selectedExperience} language={language} onNavigate={handleNavigatePage}
          onBook={handleBookFromPillar}
          onExplore={(id) => { const product = tours.find((tour) => tour.id === id); if (product) handleExplorePillar(product); }} />
      );
    }

    // 1. Standard Core Pages
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            language={language}
            onNavigate={handleNavigatePage}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      case 'fez':
        return (
          <FezPage
            language={language}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      case 'day-trips':
        return (
          <DayTripsPage
            language={language}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      case 'food-tours':
        return (
          <FoodToursPage
            language={language}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      case 'travel-tips':
        return (
          <TravelTipsPage
            language={language}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      case 'about':
        return (
          <AboutPage
            language={language}
            onNavigate={handleNavigatePage}
          />
        );
      case 'blog':
        return (
          <BlogPage
            language={language}
            onBookTour={handleBookFromPillar}
          />
        );
      default: {
        // 2. Dynamic Custom Pages from CMS
        const matchedCustomPage = customPages.find((p) => p.slug === currentPage);
        if (matchedCustomPage) {
          return (
            <CustomPageRenderer
              page={matchedCustomPage}
              language={language}
              onNavigate={handleNavigatePage}
              onBookTour={handleBookFromPillar}
            />
          );
        }
        return (
          <HomePage
            language={language}
            onNavigate={handleNavigatePage}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      }
    }
  };

  const renderCurrentPage = () => (
    <PublicPageSwitch
      document={publishedDocument}
      pageId={currentPage}
      experienceId={selectedExperience?.id}
      language={language}
      onNavigate={handleNavigatePage}
      onBook={handleCmsBook}
      legacy={<React.Suspense fallback={<p role="status">{language === 'fr' ? 'Chargement…' : language === 'es' ? 'Cargando…' : 'Loading…'}</p>}>{renderLegacyPage()}</React.Suspense>}
    />
  );

  if (admin) {
    if (AdminApp) return <AdminApp language={language} onClose={closeAdmin} />;
    if (AdminApp === null) return <p>{language === 'es' ? 'La administración no está disponible. ' : 'Admin is unavailable. '}<button type="button" onClick={closeAdmin}>{language === 'es' ? 'Volver al sitio' : 'Back to site'}</button></p>;
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C2524] transition-colors" data-cms-site={publishedDocument ? "true" : undefined} data-cms-themed={publishedDocument ? String(approvedThemeActive(publishedDocument.theme)) : undefined} data-button-variant={publishedDocument?.theme.buttonVariant} data-card-variant={publishedDocument?.theme.cardVariant} style={publishedDocument ? themeStyle(publishedDocument.theme) : undefined}>
      {/* Top Bar Navigation */}
      <Navbar
        currentPage={currentPage}
        activeCategory={selectedExperience?.pageId ?? publishedDocument?.pages.find(page => page.id === currentPage || page.slug === currentPage)?.parentId}
        language={language}
        document={publishedDocument}
        onNavigate={handleNavigatePage}
        onLanguageChange={handleLanguageChange}
        onOpenBooking={(id, title) => handleOpenBooking(id, title)}
      />

      {/* Main Page Viewport */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Site Footer */}
      <Footer
        language={language}
        document={publishedDocument}
        onNavigate={handleNavigatePage}
      />

      {/* Detail In-depth Modal */}
      <DetailModal
        pillar={selectedPillar}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        language={language}
        onBookNow={handleBookFromPillar}
      />

      {/* Booking & Inquiry Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        language={language}
        initialTourTitle={bookingTourTitle}
      />


      {/* Floating Real-Time Guide WhatsApp Inquiry Button */}
      <FloatingWhatsAppButton
        language={language}
        currentPage={currentPage}
        activePillar={selectedExperience}
      />
    </div>
  );
}

export default function App() {
  return (
    <CmsProvider>
      <AppContent />
    </CmsProvider>
  );
}
