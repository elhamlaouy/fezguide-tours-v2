import React from 'react';
import { Language, PageId } from '../types';
import { FezToursCtaSection } from '../components/FezToursCtaSection';
import { PageCrumbBar } from '../components/PageCrumbBar';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';

interface MedinaArticlePageProps {
  language: Language;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onExploreTours: () => void;
}

const content = {
  en: {
    title: 'Explore the Medina',
    paragraphs: [
      'Before exploring the Medina, it helps to understand Fez itself. For local people, the Medina is more than simply the old part of the city. It is a place connected to our history, traditions, families and everyday life. When we say “the Medina,” we are talking about the historic and traditional heart of Fez — a place that has kept its character through generations.',
      'Fez has different areas, each with its own character. Fes el-Bali is the Old Medina, known for its narrow streets, traditional souks, historic buildings and local workshops. Fes Jdid and the Mellah form another important historic part of the city, connected to the Royal Palace and the Jewish heritage of Fez. The New City shows another side of Fez, with modern streets, cafés, restaurants and everyday city life.',
      'The Medina of Fez is not a museum. People still live and work here every day. Craftsmen work in traditional workshops, shopkeepers open their stores, local people buy food and bread, and traditional crafts continue to be part of everyday life. As you walk through the Medina, you are not only looking at history. You are watching a living part of Fez.',
      'The Medina is famous for its historic gates, narrow streets, traditional souks and maze-like passages. Once you enter through one of its gates, the atmosphere quickly changes. The lanes become narrower and you begin to discover workshops, small shops, residential areas and hidden corners. You can walk through the Medina many times and still discover something new.',
      'There is a difference between simply walking through the Medina and understanding what you are seeing. A local guide can help you discover the history behind the buildings, understand traditional crafts, find less-known places and experience the Medina beyond the usual tourist route. Our goal is not only to show you the famous landmarks, but to help you notice the small details that make Fez what it is.',
      'Exploring the Medina is also about tasting it. Traditional food, local markets, spices, bakeries and small food shops are all part of everyday life in Fez. For many visitors, discovering the Medina means experiencing its food as well as its history and culture.',
      'After spending time inside the narrow streets of the Medina, it is worth looking at Fez from above. From a panoramic viewpoint, you can see the rooftops, minarets, historic walls and the landscape surrounding the city. It gives you a completely different perspective and helps you understand the size and character of the Medina.',
      'Exploring Fez does not have to end when you leave the Medina. At night, the New City offers a different atmosphere, with cafés, restaurants, modern streets and the lights of the city. After discovering the traditional side of Fez during the day, experiencing the New City at night allows you to see another side of the same city.',
    ],
    closing: 'Discover the Medina with someone who knows its streets, stories, traditions and hidden places. Walk beyond the famous landmarks, meet local people, taste traditional food and experience the everyday life of Fez.',
    lead: 'Explore our Fez tours and discover the city through local eyes.',
    back: 'Back to Fez',
    cta: 'Explore Our Fez Tours',
  },
  fr: {
    title: 'Explorer la Médina',
    paragraphs: [
      'Avant d’explorer la Médina, il est utile de comprendre Fès elle-même. Pour les habitants, la Médina est bien plus que la vieille partie de la ville. C’est un lieu lié à notre histoire, à nos traditions, à nos familles et à notre vie quotidienne. Lorsque nous parlons de « la Médina », nous parlons du cœur historique et traditionnel de Fès — un lieu qui a conservé son caractère au fil des générations.',
      'Fès se compose de différents quartiers, chacun avec son propre caractère. Fès el-Bali est l’ancienne Médina, connue pour ses ruelles étroites, ses souks traditionnels, ses bâtiments historiques et ses ateliers locaux. Fès Jdid et le Mellah forment une autre partie historique importante de la ville, liée au Palais Royal et au patrimoine juif de Fès. La Ville Nouvelle montre un autre visage de Fès, avec ses rues modernes, ses cafés, ses restaurants et sa vie quotidienne.',
      'La Médina de Fès n’est pas un musée. Des personnes y vivent et y travaillent encore chaque jour. Les artisans travaillent dans leurs ateliers traditionnels, les commerçants ouvrent leurs boutiques, les habitants achètent leur nourriture et leur pain, et les métiers traditionnels continuent de faire partie de la vie quotidienne. En parcourant la Médina, vous ne regardez pas seulement l’histoire. Vous observez une partie vivante de Fès.',
      'La Médina est célèbre pour ses portes historiques, ses rues étroites, ses souks traditionnels et ses passages en forme de labyrinthe. Dès que vous franchissez l’une de ses portes, l’atmosphère change rapidement. Les ruelles se resserrent et vous commencez à découvrir des ateliers, de petites boutiques, des quartiers résidentiels et des coins cachés. Vous pouvez parcourir la Médina de nombreuses fois et toujours découvrir quelque chose de nouveau.',
      'Il y a une différence entre simplement marcher dans la Médina et comprendre ce que l’on voit. Un guide local peut vous aider à découvrir l’histoire des bâtiments, à comprendre les métiers traditionnels, à trouver des lieux moins connus et à vivre la Médina au-delà des circuits touristiques habituels. Notre objectif n’est pas seulement de vous montrer les monuments célèbres, mais de vous aider à remarquer les petits détails qui font de Fès ce qu’elle est.',
      'Explorer la Médina, c’est aussi la goûter. La cuisine traditionnelle, les marchés locaux, les épices, les boulangeries et les petites boutiques alimentaires font tous partie de la vie quotidienne à Fès. Pour de nombreux visiteurs, découvrir la Médina signifie vivre sa cuisine autant que son histoire et sa culture.',
      'Après avoir passé du temps dans les ruelles étroites de la Médina, il vaut la peine de regarder Fès d’en haut. Depuis un point de vue panoramique, vous pouvez voir les toits, les minarets, les remparts historiques et le paysage qui entoure la ville. Cela offre une perspective complètement différente et aide à comprendre la taille et le caractère de la Médina.',
      'Explorer Fès ne doit pas forcément s’arrêter lorsque vous quittez la Médina. La nuit, la Ville Nouvelle offre une atmosphère différente, avec ses cafés, ses restaurants, ses rues modernes et les lumières de la ville. Après avoir découvert le côté traditionnel de Fès pendant la journée, découvrir la Ville Nouvelle le soir permet de voir un autre visage de la même ville.',
    ],
    closing: 'Découvrez la Médina avec quelqu’un qui connaît ses rues, ses histoires, ses traditions et ses lieux cachés. Allez au-delà des monuments célèbres, rencontrez les habitants, goûtez la cuisine traditionnelle et vivez le quotidien de Fès.',
    lead: 'Explorez nos visites de Fès et découvrez la ville à travers des yeux locaux.',
    back: 'Retour à Fès',
    cta: 'Explorer Nos Visites de Fès',
  },
};

const imageGroups = [
  ['/images/fez-medina/medina-01.jpg'],
  ['/images/fez-medina/medina-02.jpg', '/images/fez-medina/medina-03.jpg'],
  ['/images/fez-medina/medina-04.jpg', '/images/fez-medina/medina-05.jpg', '/images/fez-medina/medina-06.jpg', '/images/fez-medina/medina-07.jpg'],
  ['/images/fez-medina/medina-08.jpg', '/images/fez-medina/medina-09.jpg'],
  ['/images/fez-medina/medina-10.jpg'],
  ['/images/fez-medina/medina-11.jpg'],
  ['/images/fez-medina/medina-12.jpg'],
  ['/images/fez-medina/medina-13.jpg'],
];

const imageAlts = [
  'Traditional Fez Medina market lane with Moroccan flags',
  'Street in the modern city of Fez',
  'Public square and everyday life in Fez',
  'Craftsman working in a traditional Fez workshop',
  'Artisan shaping metal by hand in Fez',
  'Artisans working together in a Fez workshop',
  'Local leather craftsman in the Medina',
  'Historic gate at the entrance to the Fez Medina',
  'Narrow market passage inside the Fez Medina',
  'Historic architecture and courtyard in Fez',
  'Traditional bakery and local food in Fez',
  'Panoramic view over the rooftops of Fez',
  'Fountain and city lights in the New City of Fez at night',
];

export const MedinaArticlePage: React.FC<MedinaArticlePageProps> = ({ language, onBack, onNavigate, onExploreTours }) => {
  const copy = language === 'fr' ? content.fr : content.en;
  const fallbackEnglish = language === 'ar';

  return (
    <div className="bg-[#FAF8F5] pb-20" dir={fallbackEnglish ? 'ltr' : undefined}>
      <PageCrumbBar
        language={language}
        parentLabel={language === 'ar' ? 'فاس' : language === 'fr' ? 'Fès' : 'Fez'}
        currentTitle={copy.title}
        onHome={() => onNavigate('home')}
        onParent={onBack}
      />

      <article className="editorial-story-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12 sm:space-y-16">
        <header className="max-w-3xl space-y-5">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#005F5A]">{copy.title}</h1>
          <p className="text-base sm:text-lg leading-relaxed text-[#445250]">{copy.paragraphs[0]}</p>
        </header>

        {imageGroups.map((images, index) => (
          <section key={index} className="space-y-7">
            <div className={`grid gap-4 ${index === 7 ? 'max-w-[800px] mx-auto' : ''} ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {images.map((src, imageIndex) => (
                <div key={src} className={`overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm ${images.length === 1 ? 'max-h-[620px]' : 'aspect-4/3'}`}>
                  <img
                    src={src}
                    alt={imageAlts[imageGroups.slice(0, index).flat().length + imageIndex]}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={`w-full h-full ${images.length === 1 ? 'object-contain bg-[#1C2524]' : 'object-cover'}`}
                  />
                </div>
              ))}
            </div>
            {index < copy.paragraphs.length - 1 && <p className="editorial-story-copy max-w-3xl mx-auto text-sm sm:text-base leading-8 text-[#445250]">{copy.paragraphs[index + 1]}</p>}
          </section>
        ))}

        <FezToursCtaSection language={fallbackEnglish ? 'en' : language} onExploreTours={onExploreTours} />

        <TripadvisorReviewsSection language={language === 'fr' ? 'fr' : 'en'} />
      </article>
    </div>
  );
};
