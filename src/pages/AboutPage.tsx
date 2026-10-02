import React, { useState } from 'react';
import { Language } from '../types';
import { ABOUT_STORY, FAQ_ITEMS, UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { Users, Award, ShieldCheck, Calendar, Heart, HelpCircle, ChevronDown, ChevronUp, MapPin, Compass } from 'lucide-react';

interface AboutPageProps {
  language: Language;
  onBookTour: (guideName?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  language,
  onBookTour,
}) => {
  const { teamMembers } = useCms();
  const story = ABOUT_STORY;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="relative bg-[#15201F] text-white py-16 sm:py-24 overflow-hidden">
        <img
          src="/src/assets/images/real/fez_explore_medina_image1.jpg"
          alt="Medina of Fez"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15201F] via-[#15201F]/60 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E07A5F]">
            <Compass className="w-4 h-4 text-[#00A896]" />
            <span>Fez Guide Tours — Local Guiding Team</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
            {story.title[language]}
          </h1>

          <p className="text-sm sm:text-base text-[#CCD8D6] max-w-2xl mx-auto leading-relaxed">
            {story.subtitle[language]}
          </p>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Story Section */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 shadow-xs space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                {language === 'ar' ? 'من نحن' : language === 'fr' ? 'À Propos de Nous' : 'About Us'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
                {language === 'ar'
                  ? 'اكتشف فاس بطريقة بسيطة، مريحة وتجربة خاصة بك'
                  : language === 'fr'
                  ? 'Découvrir Fès de manière simple, confortable et personnelle'
                  : 'Discover Fez in a Simple, Comfortable and Personal Way'}
              </h2>
              <p className="text-sm text-[#4E5B59] leading-relaxed">
                {story.storyParagraph1[language]}
              </p>
              <p className="text-sm text-[#4E5B59] leading-relaxed">
                {story.storyParagraph2[language]}
              </p>

              {/* Slogan highlight */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#C84B31] shrink-0" />
                <p className="text-xs sm:text-sm font-bold text-[#005F5A]">
                  {language === 'ar'
                    ? 'مرحباً بكم في فاس. اكتشفوا المدينة بعيون أهلها.'
                    : language === 'fr'
                    ? 'Bienvenue à Fès. Découvrez la ville à travers des yeux locaux.'
                    : 'Welcome to Fez. See the city through local eyes.'}
                </p>
              </div>
            </div>

            {/* Team in Fez Photo */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl overflow-hidden border border-[#E7E2DA] shadow-md bg-[#1C2524] relative aspect-4/3 group">
                <img
                  src="/src/assets/images/real/about_us_image1.jpg"
                  alt="Our team in Fez"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white text-xs">
                  <span className="font-bold block">
                    {language === 'ar' ? 'فريقنا في دروب فاس العتيقة' : 'Our Team in the Medina of Fez'}
                  </span>
                  <span className="text-[11px] text-[#CCD8D6]">
                    {language === 'ar' ? 'أبناء فاس في خدمتكم' : 'Native hosts & licensed guides'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillars of Integrity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#F2ECE4]">
            {story.pillars.map((pillar, idx) => (
              <div key={idx} className="space-y-2 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <div className="w-9 h-9 rounded-xl bg-[#005F5A] text-white flex items-center justify-center font-bold text-xs">
                  0{idx + 1}
                </div>
                <h4 className="text-sm font-bold text-[#1C2524]">
                  {pillar.title[language]}
                </h4>
                <p className="text-xs text-[#52605E] leading-relaxed">
                  {pillar.desc[language]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Meet Our Team */}
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {language === 'ar' ? 'فريق العمل' : 'Our Dedicated Team'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
              {language === 'ar' ? 'تعرف على فريق فاس جايد تورز' : 'Meet Our Team'}
            </h2>
            <p className="text-xs sm:text-sm text-[#52605E]">
              {language === 'ar'
                ? 'فريق متكامل يجمع بين المؤسس والمرشدين المعتمدين والسائقين المحترفين لخدمتكم'
                : 'Working closely with travellers, local guides, and trusted partners.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Photo */}
                <div className="relative aspect-4/3 w-full bg-[#1C2524] overflow-hidden">
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="text-base font-bold drop-shadow-xs">{member.name}</h3>
                    <p className="text-[11px] text-[#E07A5F] font-semibold">{member.role[language]}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-xs text-[#52605E] leading-relaxed">
                      {member.bio[language]}
                    </p>

                    <div className="pt-2 text-[11px] text-[#42504E] space-y-1.5 border-t border-[#F2ECE4]">
                      <div className="flex items-center gap-1.5 font-semibold text-[#005F5A]">
                        <Award className="w-3.5 h-3.5" />
                        <span>{member.experience[language]}</span>
                      </div>
                      <div className="text-[#728280]">
                        {language === 'ar' ? 'اللغات:' : 'Languages:'} {member.languages.join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <div className="pt-3 border-t border-[#F2ECE4]">
                    <button
                      onClick={() => onBookTour(`Inquiry with ${member.name}`)}
                      className="w-full py-2.5 px-3 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{UI_TEXT.common.bookNow[language]}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Photo Gallery from Google Drive */}
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
              {language === 'ar' ? 'لقطات حقيقية من فاس' : 'Through Local Eyes'}
            </span>
            <h3 className="text-xl font-bold text-[#1C2524]">
              {language === 'ar' ? 'مشاهد من جولاتنا ودروب مدينتنا' : 'Moments from Our Experiences'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { src: '/src/assets/images/real/about_us_image3.jpg', title: 'Medina Alleys' },
              { src: '/src/assets/images/real/about_us_image5.jpg', title: 'Scenic Day Trips' },
              { src: '/src/assets/images/real/about_us_image7.jpg', title: 'Local Crafts' },
              { src: '/src/assets/images/real/about_us_image8.jpg', title: 'Authentic Moments' },
            ].map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-[#E7E2DA] shadow-xs group">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Complete Frequently Asked Questions (FAQ) Accordion */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 shadow-xs space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              <HelpCircle className="w-4 h-4 text-[#005F5A]" />
              <span>{language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
              {language === 'ar'
                ? 'إجابات واضحة لكل ما قد يشغل بالك قبل الحجز'
                : 'Everything You Need to Know Before Booking'}
            </h2>
            <p className="text-xs sm:text-sm text-[#52605E]">
              {language === 'ar'
                ? 'تخطط لرحلتك إلى فاس؟ إليك إجابات عن أبرز الأسئلة التي يطرحها المسافرون.'
                : 'Planning a trip to Fez? Here are answers to questions travellers often ask before booking with us.'}
            </p>
          </div>

          <div className="space-y-3 max-w-4xl mx-auto">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={item.id}
                  className="border border-[#E7E2DA] rounded-2xl overflow-hidden transition-all bg-[#FAF8F5]/60 hover:bg-[#FAF8F5]"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#1C2524] cursor-pointer"
                  >
                    <span>{item.question[language]}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#005F5A] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#728280] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs text-[#4E5B59] leading-relaxed border-t border-[#F2ECE4] bg-white">
                      <p>{item.answer[language]}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact / Question CTA */}
          <div className="text-center pt-4 border-t border-[#F2ECE4]">
            <p className="text-xs text-[#52605E] mb-3">
              {language === 'ar'
                ? 'هل لديك سؤال آخر؟ يسعدنا دائماً التحدث معك وتقديم المساعدة.'
                : 'Still have a question? Talk to someone who knows Fez.'}
            </p>
            <a
              href="https://wa.me/212661234567?text=Hello!%20I%20have%20a%20question%20about%20visiting%20Fez%20with%20FezGuideTours."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>{UI_TEXT.common.whatsappChat[language]}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
