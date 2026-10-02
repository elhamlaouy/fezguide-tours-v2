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
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';

// Pages
import { HomePage } from './pages/HomePage';
import { FezPage } from './pages/FezPage';
import { DayTripsPage } from './pages/DayTripsPage';
import { FoodToursPage } from './pages/FoodToursPage';
import { TravelTipsPage } from './pages/TravelTipsPage';
import { AboutPage } from './pages/AboutPage';
import { BlogPage } from './pages/BlogPage';
import { CustomPageRenderer } from './pages/CustomPageRenderer';

function AppContent() {
  const { customPages } = useCms();
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedPillar, setSelectedPillar] = useState<SectionPillar | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingTourTitle, setBookingTourTitle] = useState<string>('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  // Synchronize HTML dir attribute for full RTL support when Arabic is selected
  useEffect(() => {
    const isRtl = language === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  // When a custom page is deleted, automatically fall back to home if user was on that page
  useEffect(() => {
    const standardPages = ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips', 'about', 'blog'];
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

  const handleExplorePillar = (pillar: SectionPillar) => {
    setSelectedPillar(pillar);
    setDetailModalOpen(true);
  };

  const handleBookFromPillar = (tourTitle?: string) => {
    setDetailModalOpen(false);
    setBookingTourTitle(tourTitle || '');
    setBookingModalOpen(true);
  };

  const renderCurrentPage = () => {
    // 1. Standard Core Pages
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            language={language}
            onNavigate={setCurrentPage}
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
              onNavigate={setCurrentPage}
              onBookTour={handleBookFromPillar}
            />
          );
        }
        return (
          <HomePage
            language={language}
            onNavigate={setCurrentPage}
            onExplore={handleExplorePillar}
            onBookTour={handleBookFromPillar}
          />
        );
      }
    }
  };

  if (adminOpen) {
    return (
      <AdminDashboard
        onClose={() => setAdminOpen(false)}
        language={language}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C2524] transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        currentPage={currentPage}
        language={language}
        onNavigate={setCurrentPage}
        onLanguageChange={setLanguage}
        onOpenBooking={(id, title) => handleOpenBooking(id, title)}
        onOpenAdmin={() => setAdminLoginOpen(true)}
      />

      {/* Main Page Viewport */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Site Footer */}
      <Footer
        language={language}
        onNavigate={setCurrentPage}
        onOpenAdmin={() => setAdminLoginOpen(true)}
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

      {/* Admin Login PIN Modal */}
      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={() => {
          setAdminLoginOpen(false);
          setAdminOpen(true);
        }}
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
