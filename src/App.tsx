/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, PageId, SectionPillar } from './types';
import { CmsProvider, useCms } from './context/CmsContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { DetailModal } from './components/DetailModal';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';

// Pages
import { HomePage } from './pages/HomePage';
import { FezPage } from './pages/FezPage';
import { DayTripsPage } from './pages/DayTripsPage';
import { FoodToursPage } from './pages/FoodToursPage';
import { TravelTipsPage } from './pages/TravelTipsPage';
import { AboutPage } from './pages/AboutPage';
import { BlogPage } from './pages/BlogPage';
import { CustomPageRenderer } from './pages/CustomPageRenderer';
import { ExperienceDetailPage } from './pages/ExperienceDetailPage';
import { MedinaArticlePage } from './pages/MedinaArticlePage';
import { HistoryCultureArticlePage } from './pages/HistoryCultureArticlePage';
import { ThingsToDoArticlePage } from './pages/ThingsToDoArticlePage';
import { OurFezToursPage } from './pages/OurFezToursPage';

function AppContent() {
  const { tours, customPages } = useCms();
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedExperience, setSelectedExperience] = useState<SectionPillar | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<SectionPillar | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingTourTitle, setBookingTourTitle] = useState<string>('');

  // Synchronize HTML dir attribute for full RTL support when Arabic is selected
  useEffect(() => {
    const isRtl = language === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  // Read URL search params on mount or when tours are available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tourParam = params.get('experience') || params.get('tour');
    if (tourParam) {
      const found = tours.find((t) => t.id === tourParam);
      if (found) {
        setSelectedExperience(found);
        setCurrentPage('experience-detail');
      }
    }
  }, [tours]);

  // Handle browser back and forward button clicks
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const tourParam = params.get('experience') || params.get('tour');
      if (tourParam) {
        const found = tours.find((t) => t.id === tourParam);
        if (found) {
          setSelectedExperience(found);
          setCurrentPage('experience-detail');
          return;
        }
      }
      // If no tour param, restore to page from state or fallback
      setSelectedExperience(null);
      if (e.state?.page) {
        setCurrentPage(e.state.page);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tours]);

  // When a custom page is deleted, automatically fall back to home if user was on that page
  useEffect(() => {
    const standardPages = ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips', 'about', 'blog', 'experience-detail'];
    if (!standardPages.includes(currentPage)) {
      const exists = customPages.some((p) => p.slug === currentPage);
      if (!exists) {
        setCurrentPage('home');
      }
    }
  }, [customPages, currentPage]);

  const handleOpenBooking = (tourId?: string, tourTitle?: string) => {
    setBookingTourTitle(tourTitle || '');
    setBookingModalOpen(true);
  };

  // Redirect to dedicated Product/Experience Page on card click
  const handleExplorePillar = (pillar: SectionPillar) => {
    setSelectedExperience(pillar);
    setCurrentPage('experience-detail');
    const url = new URL(window.location.href);
    url.searchParams.set('experience', pillar.id);
    window.history.pushState({ page: 'experience-detail', experienceId: pillar.id }, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigatePage = (pageId: PageId) => {
    setSelectedExperience(null);
    setCurrentPage(pageId);
    const url = new URL(window.location.href);
    url.searchParams.delete('experience');
    url.searchParams.delete('tour');
    window.history.pushState({ page: pageId }, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookFromPillar = (tourTitle?: string) => {
    setDetailModalOpen(false);
    setBookingTourTitle(tourTitle || '');
    setBookingModalOpen(true);
  };

  const renderCurrentPage = () => {
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
        <ExperienceDetailPage
          pillar={selectedExperience}
          language={language}
          onNavigate={handleNavigatePage}
          onSelectExperience={handleExplorePillar}
          onBookTour={handleBookFromPillar}
        />
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
            onBookTour={handleBookFromPillar}
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C2524] transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        currentPage={currentPage}
        activeCategory={selectedExperience?.pageId}
        language={language}
        onNavigate={handleNavigatePage}
        onLanguageChange={setLanguage}
        onOpenBooking={(id, title) => handleOpenBooking(id, title)}
      />

      {/* Main Page Viewport */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Site Footer */}
      <Footer
        language={language}
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
