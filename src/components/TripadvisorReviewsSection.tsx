import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Language } from '../types';

interface TripadvisorReviewsSectionProps {
  language: Language;
}

const tripadvisorListing = 'https://www.tripadvisor.com/Attraction_Review-g293733-d33349838-Reviews-Fez_Guide_Tours-Fez_Fez_Meknes.html';

const tripadvisorReviews = [
  {
    author: 'Mathilde H',
    title: 'A very professional guide',
    quote: 'An interesting visit in the medina and the souk with a guide who allows you to get your bearings well and have interesting information about the places',
    date: 'October 4, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1080469998-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
  },
  {
    author: 'Andi',
    title: 'Totally recommend! Highly rate and great guide.',
    quote: 'We had a fabulous tour with Momo - he was so friendly, so informative, answered our many many many questions, took us all around the Medina (great to have a guide to do this) and 100% respected our request to not “go shopping”. A wonderful guide in Fez and totally recommend!',
    date: 'October 2, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34678534-r1080241908-Private_Fez_Medina_Walking_Tour_with_a_Local_Guide-Fez_Fez_Meknes.html',
  },
  {
    author: 'Roam14564840921',
    title: 'Nice tour with abdul',
    quote: 'We enjoyed our tour , the guide was amazing and went out of his way to make our trip memorable.',
    date: 'October 1, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34090533-r1080073259-Fez_Food_Tasting_Walking_Tour-Fez_Fez_Meknes.html',
  },
  {
    author: 'mike',
    title: 'Best Guide',
    quote: 'Rashid was a fantastic guide. We were out for 5 hours and learned and saw so much. An excellent day altogether',
    date: 'September 25, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079291850-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
  },
  {
    author: 'Pamela B',
    title: 'Best ambassador for Moroccan culture',
    quote: 'My spouse and I spent the day in Fes with a price guide named Arbi, and it was absolutely outstanding. He took us through the Fes Medina and as an inquisitive person, I was delighted that he was so willing to share his incredible knowledge of the country, city, the Medina, and the workers who create beautiful leather, embroidery, carpets, blankets, and so much more.',
    date: 'September 23, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34683134-r1079032546-Fez_Old_City_Medina_Tour-Fez_Fez_Meknes.html',
  },
  {
    author: 'Tara U',
    title: 'Amazing Day in an even more amazing place!',
    quote: 'This was the most amazing day!!! Arabi was so good to us. His knowledge of Fes and its Medina is second to none. If you want a historic tour that goes at whatever pace you set, he the guide for you! I highly recommend Arabi and the Fez Medina walking tour!',
    date: 'September 23, 2026',
    url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079031217-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
  },
];

export const TripadvisorReviewsSection: React.FC<TripadvisorReviewsSectionProps> = ({ language }) => (
  <section id="tripadvisor-reviews" className="space-y-8 overflow-hidden">
    <div className="text-center max-w-xl mx-auto space-y-2 px-4">
      <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">Tripadvisor · 5.0 / 5</span>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">
        {language === 'fr' ? 'De vrais avis de voyageurs à Fès' : 'Real stories from travelers in Fez'}
      </h2>
      <p className="text-xs sm:text-sm text-[#52605E] leading-relaxed">
        {language === 'fr' ? 'Avis authentiques publiés sur la page Tripadvisor officielle de Fez Guide Tours.' : 'Verified reviews published on the official Fez Guide Tours Tripadvisor page.'}
      </p>
    </div>

    <div className="tripadvisor-marquee" tabIndex={0} aria-label={language === 'es' ? "Opiniones de viajeros en Tripadvisor" : "Tripadvisor traveler reviews"}>
      <div className="tripadvisor-track">
        {[tripadvisorReviews, tripadvisorReviews].map((reviews, copyIndex) => (
          <div className="tripadvisor-set" key={copyIndex}>
            {reviews.map((review) => {
              const duplicate = copyIndex === 1;
              return (
                <a key={`${copyIndex}-${review.url}`} className="tripadvisor-card" href={review.url} target="_blank" rel="noopener noreferrer" tabIndex={duplicate ? -1 : 0} aria-hidden={duplicate} dir="ltr">
                  <div className="tripadvisor-card-head">
                    <span className="tripadvisor-avatar" aria-hidden="true">{review.author.charAt(0).toUpperCase()}</span>
                    <span className="tripadvisor-author"><strong>{review.author}</strong><small>Tripadvisor · {review.date}</small></span>
                    <svg className="tripadvisor-mark" viewBox="0 0 48 28" aria-label="Tripadvisor" role="img"><circle cx="14" cy="15" r="9"/><circle cx="34" cy="15" r="9"/><circle cx="14" cy="15" r="3"/><circle cx="34" cy="15" r="3"/><path d="M20 9h8M24 9l-5-6h10z"/></svg>
                  </div>
                  <div className="tripadvisor-bubbles" aria-label="5 out of 5 bubbles" role="img">{[0, 1, 2, 3, 4].map((bubble) => <span key={bubble} />)}</div>
                  <h3>{review.title}</h3>
                  <p>“{review.quote}”</p>
                  <span className="tripadvisor-read">{language === 'es' ? 'Leer en Tripadvisor' : language === 'fr' ? 'Lire sur Tripadvisor' : 'Read on Tripadvisor'} <ArrowRight aria-hidden="true" /></span>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    <div className="text-center">
      <a href={tripadvisorListing} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-[#005F5A] hover:text-[#C84B31] transition-colors">
        {language === 'fr' ? 'Lire les 82 avis sur Tripadvisor' : 'Read all 82 reviews on Tripadvisor'} <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  </section>
);
