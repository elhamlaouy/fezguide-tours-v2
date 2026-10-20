import React from 'react';
import { ApprovedSection, ApprovedSections, useApprovedContent } from '../cms/approved-content';
import { responsiveImageProps } from '../cms/optimized-image';
import type { CmsImage } from '../cms/schema';
import { Language, PageId } from '../types';
import { PageCrumbBar } from '../components/PageCrumbBar';

interface AboutPageProps {
  language: Language;
  onNavigate: (page: PageId) => void;
}

type Copy = Record<Language, string>;

const line = (value: Copy, language: Language) => value[language];

const Photo = ({ src, alt, width, height }: { src: string; alt: string; width?: number; height?: number }) => {
  const portrait = Boolean(height && width && height > width);
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm flex items-center justify-center ${portrait ? 'max-h-[620px]' : 'aspect-4/3'}`}>
      <img
        {...responsiveImageProps(src, '(min-width: 640px) 50vw, 100vw', true)}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={portrait ? 'max-h-[620px] w-auto max-w-full object-contain' : 'w-full h-full object-cover'}
      />
    </div>
  );
};

export const AboutPage: React.FC<AboutPageProps> = ({ language, onNavigate }) => {
  const { document, page, section } = useApprovedContent('about');
  const photo = (image: CmsImage) => {
    const media = document?.media.find(media => media.id === image.mediaId);
    return media ? <Photo key={image.mediaId} src={media.src} alt={image.alt[language]} width={media.width} height={media.height} /> : null;
  };
  const paragraphs = (id: string) => (section(id, 'richText')?.blocks ?? []).map((block, index) => (
    <p key={index} className="editorial-story-copy text-sm sm:text-base leading-8 text-[#445250]">{'text' in block ? block.text[language] : block.items[language].join('\n')}</p>
  ));
  const title = document ? page?.title[language] ?? '' : language === 'es' ? "Sobre nosotros y nuestro equipo" : language === 'fr' ? 'À propos et notre équipe' : 'About Us & Our Team';

  return (
    <div className="bg-[#FAF8F5] pb-20" dir="ltr">
      <PageCrumbBar
        language={language}
        parentLabel={title}
        currentTitle={title}
        onHome={() => onNavigate('home')}
        onParent={() => onNavigate('home')}
      />

      <article className="editorial-story-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12 sm:space-y-16"><ApprovedSections>
        <ApprovedSection id="introduction"><header className="max-w-3xl space-y-5">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#005F5A]">{title}</h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#005F5A]">{document ? section('introduction', 'richText')?.title?.[language] ?? '' : (language === 'es' ? "Sobre nosotros" : language === 'fr' ? 'À propos' : 'About Us')}</h2>
          {document ? paragraphs('introduction') : ([
            line({ en: 'We are a small local team based in Fez.', fr: 'Nous sommes une petite équipe locale basée à Fès.', es: "Somos un pequeño equipo local afincado en Fez." }, language),
            line({
              en: 'We created Fez Guide Tours to share our city with travellers and help them discover Fez in a simple, comfortable and personal way.',
              fr: 'Nous avons créé Fez Guide Tours pour partager notre ville avec les voyageurs et les aider à découvrir Fès de façon simple, confortable et personnelle.',
              es: "Creamos Fez Guide Tours para compartir nuestra ciudad con los viajeros y ayudarles a descubrir Fez de una manera sencilla, cómoda y personal.",
            }, language),
            line({
              en: 'We know the streets of the Medina, the different areas of the city, the local food, traditions and everyday life.',
              fr: 'Nous connaissons les rues de la médina, les différents quartiers, la cuisine locale, les traditions et la vie quotidienne.',
              es: "Conocemos las calles de la medina, los distintos barrios de la ciudad, la comida local, las tradiciones y la vida cotidiana.",
            }, language),
            line({
              en: 'Our goal is simple: to help you enjoy Fez and discover the city through local eyes.',
              fr: 'Notre but est simple : vous aider à profiter de Fès et à découvrir la ville à travers des yeux locaux.',
              es: "Nuestro objetivo es sencillo: ayudaros a disfrutar de Fez y descubrir la ciudad a través de los ojos de sus habitantes.",
            }, language),
          ].map((paragraph) => (
            <p key={paragraph} className="editorial-story-copy text-sm sm:text-base leading-8 text-[#445250]">{paragraph}</p>
          )))}
        </header></ApprovedSection>

        <ApprovedSection id="med"><section className="space-y-7">
          <h2 className="max-w-3xl text-2xl sm:text-3xl font-extrabold tracking-tight text-[#005F5A]">{document ? section('med', 'richText')?.title?.[language] ?? '' : (language === 'es' ? "Conoced a nuestro equipo" : language === 'fr' ? 'Notre équipe' : 'Meet Our Team')}</h2>
          {document ? (section('med', 'richText')?.blocks ?? []).map((block, index) => block.type === 'heading' ? (
            <h3 key={index} className="text-xl font-bold text-[#1C2524]">{block.text[language]}</h3>
          ) : (
            <p key={index} className={index === 1 ? 'text-sm font-bold uppercase tracking-wider text-[#C84B31]' : 'editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]'}>{'text' in block ? block.text[language] : block.items[language].join('\n')}</p>
          )) : (<><h3 className="text-xl font-bold text-[#1C2524]">Med</h3>
          <p className="text-sm font-bold uppercase tracking-wider text-[#C84B31]">
            {language === 'es' ? "Fundador y anfitrión local" : language === 'fr' ? 'Fondateur et hôte local' : 'Founder & Local Host'}
          </p>
          <p className="editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]">
            {line({
              en: 'Med is based in Fez and works closely with travellers, local guides and partners to organize tours and experiences around the city.',
              fr: 'Med est basé à Fès. Il travaille avec les voyageurs, les guides locaux et les partenaires pour organiser les visites et les expériences dans la ville.',
              es: "Med vive en Fez y colabora estrechamente con viajeros, guías locales y colaboradores para organizar visitas y experiencias en la ciudad.",
            }, language)}
          </p></>)}
          <ApprovedSection id="med-photo"><div className="max-w-xl">{document ? (section('med-photo', 'gallery')?.images ?? []).map(photo) : (<>
            <Photo src="/images/about/med.webp" alt={language === 'es' ? "Med con un visitante en un taller de Fez" : "Med with a visitor in a Fez workshop"} width={1440} height={1440} />
          </>)}</div></ApprovedSection>
        </section></ApprovedSection>

        <ApprovedSection id="guides"><section className="space-y-7">
          <h3 className="text-xl font-bold text-[#1C2524]">{document ? section('guides', 'richText')?.title?.[language] ?? '' : (language === 'es' ? "Nuestros guías locales" : language === 'fr' ? 'Nos guides locaux' : 'Our Local Guides')}</h3>
          {document ? paragraphs('guides') : (<p className="editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]">
            {line({
              en: 'We work with local guides who know Fez, its history, culture and Medina. They are here to share their knowledge, answer your questions and help you enjoy your time in the city.',
              fr: 'Nous travaillons avec des guides locaux qui connaissent Fès, son histoire, sa culture et sa médina. Ils partagent ce qu’ils savent, répondent à vos questions et vous aident à profiter de la ville.',
              es: "Trabajamos con guías locales que conocen Fez, su historia, su cultura y su medina. Comparten sus conocimientos, responden a vuestras preguntas y os ayudan a disfrutar de vuestro tiempo en la ciudad.",
            }, language)}
          </p>)}
          <ApprovedSection id="guides-photos"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{document ? (section('guides-photos', 'gallery')?.images ?? []).map(photo) : (<>
            <Photo src="/images/about/guides-01.webp" alt={language === 'es' ? "Un grupo con un guía local ante una puerta de Fez" : "A group with a local guide at a Fez gate"} width={1600} height={1200} />
            <Photo src="/images/about/guides-02.webp" alt={language === 'es' ? "Un guía paseando con visitantes por una calle de la medina" : "A guide walking with visitors in a Medina lane"} width={1536} height={2048} />
            <Photo src="/images/about/guides-03.webp" alt={language === 'es' ? "Un guía con un grupo ante una puerta histórica" : "A guide with a group at a historic doorway"} width={2048} height={1536} />
            <Photo src="/images/about/guides-04.webp" alt={language === 'es' ? "Un guía explicando un mapa a los visitantes" : "A guide explaining a map to visitors"} width={975} height={1300} />
          </>)}</div></ApprovedSection>
        </section></ApprovedSection>

        <ApprovedSection id="drivers"><section className="space-y-7">
          <h3 className="text-xl font-bold text-[#1C2524]">{document ? section('drivers', 'richText')?.title?.[language] ?? '' : (language === 'es' ? "Nuestros conductores y colaboradores locales" : language === 'fr' ? 'Nos chauffeurs et partenaires locaux' : 'Our Drivers & Local Partners')}</h3>
          {document ? paragraphs('drivers') : (<p className="editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]">
            {line({
              en: 'For day trips, transfers and other experiences, we work with trusted local drivers and partners. They help us make your experience comfortable, organized and enjoyable.',
              fr: 'Pour les excursions, les transferts et les autres expériences, nous travaillons avec des chauffeurs et des partenaires locaux de confiance. Ils aident à rendre l’expérience confortable, organisée et agréable.',
              es: "Para las excursiones de un día, los traslados y otras experiencias, trabajamos con conductores y colaboradores locales de confianza. Nos ayudan a ofreceros una experiencia cómoda, organizada y agradable.",
            }, language)}
          </p>)}
          <ApprovedSection id="drivers-photos"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{document ? (section('drivers-photos', 'gallery')?.images ?? []).map(photo) : (<>
            <Photo src="/images/about/drivers-01.webp" alt={language === 'es' ? "Un colaborador local en un mirador de montaña" : "A local partner at a mountain viewpoint"} width={800} height={600} />
            <Photo src="/images/about/drivers-02.webp" alt={language === 'es' ? "Tres hombres del equipo local al aire libre" : "Three men from the local team outdoors"} width={800} height={600} />
            <Photo src="/images/about/drivers-03.webp" alt={language === 'es' ? "Un grupo con un colaborador local en las montañas" : "A group with a local partner in the mountains"} width={800} height={600} />
            <Photo src="/images/about/drivers-04.webp" alt={language === 'es' ? "Viajeros con un colaborador local en un vehículo" : "Travellers with a local partner in a vehicle"} width={750} height={421} />
            <Photo src="/images/about/drivers-05.webp" alt={language === 'es' ? "Colaboradores locales sentados juntos en Fez" : "Local partners seated together in Fez"} width={800} height={593} />
          </>)}</div></ApprovedSection>
        </section></ApprovedSection>

        <ApprovedSection id="why"><section className="max-w-3xl space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#005F5A]">{document ? section('why', 'richText')?.title?.[language] ?? '' : (language === 'es' ? "Por qué lo hacemos" : language === 'fr' ? 'Pourquoi nous le faisons' : 'Why We Do It')}</h2>
          {document ? (section('why', 'richText')?.blocks ?? []).map((block, index, blocks) => (<p key={index} className={index === blocks.length - 1 ? 'text-xl font-extrabold text-[#005F5A]' : 'editorial-story-copy text-sm sm:text-base leading-8 text-[#445250]'}>{'text' in block ? block.text[language] : block.items[language].join('\n')}</p>)) : (<><p className="editorial-story-copy text-sm sm:text-base leading-8 text-[#445250]">
            {line({
              en: 'We believe that the best way to discover Fez is not only by visiting its famous places, but also by seeing how the city really lives.',
              fr: 'Nous pensons que la meilleure façon de découvrir Fès n’est pas seulement de visiter ses lieux célèbres, mais aussi de voir comment la ville vit vraiment.',
              es: "Creemos que la mejor manera de descubrir Fez no es solo visitar sus lugares famosos, sino también ver cómo vive realmente la ciudad.",
            }, language)}
          </p>
          <p className="editorial-story-copy text-sm sm:text-base leading-8 text-[#445250]">
            {line({
              en: 'We want to welcome you to our city, share what we know and help you create good memories in Fez.',
              fr: 'Nous voulons vous accueillir dans notre ville, partager ce que nous savons et vous aider à garder de bons souvenirs à Fès.',
              es: "Queremos daros la bienvenida a nuestra ciudad, compartir lo que sabemos y ayudaros a crear buenos recuerdos de Fez.",
            }, language)}
          </p>
          <p className="text-xl font-extrabold text-[#005F5A]">
            {line({
              en: 'Welcome to Fez. See the city through local eyes.',
              fr: 'Bienvenue à Fès. Voyez la ville à travers des yeux locaux.',
              es: "Bienvenidos a Fez. Conoced la ciudad a través de los ojos de sus habitantes.",
            }, language)}
          </p></>)}
        </section></ApprovedSection>
      </ApprovedSections></article>
    </div>
  );
};
