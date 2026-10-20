import React from 'react';
import { ApprovedSection, ApprovedSections } from '../cms/approved-content';
import { responsiveImageProps } from '../cms/optimized-image';
import { Language, PageId } from '../types';
import { useFezEditorial } from '../components/EditorialArticlePage';
import { FezToursCtaSection } from '../components/FezToursCtaSection';
import { PageCrumbBar } from '../components/PageCrumbBar';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';

interface ThingsToDoArticlePageProps {
  language: Language;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onExploreTours: () => void;
}

const imageAlts = {
  en: [
    'Busy souk lane in the old Medina of Fez',
    'Artisan working in a traditional workshop in Fez',
    'Colorful goods hanging over a narrow market lane in Fez',
    'Glasses of drinks on a table in Fez',
    'Traditional street and doorway with laundry in Fez',
    'View over densely packed rooftops in Fez',
    'Outdoor café terrace lit at night in Fez',
    'Visitors posing at a decorated entrance in Fez',
  ],
  fr: [
    'Allée animée d’un souk dans l’ancienne médina de Fès',
    'Artisan travaillant dans un atelier traditionnel à Fès',
    'Marchandises colorées suspendues au-dessus d’une ruelle commerçante à Fès',
    'Verres de boissons posés sur une table à Fès',
    'Rue traditionnelle et porte avec du linge étendu à Fès',
    'Vue sur les toits serrés de Fès',
    'Terrasse de café en plein air éclairée la nuit à Fès',
    'Visiteurs posant devant une entrée décorée à Fès',
  ],
  es: ["Calle animada de un zoco en la medina antigua de Fez", "Artesano trabajando en un taller tradicional de Fez", "Mercancías de colores colgadas sobre una calle comercial estrecha de Fez", "Vasos con bebidas sobre una mesa en Fez", "Calle y puerta tradicionales con ropa tendida en Fez", "Vista de los tejados apiñados de Fez", "Terraza de una cafetería al aire libre iluminada por la noche en Fez", "Visitantes posando ante una entrada decorada en Fez"]
};

const imageDimensions = [
  [800, 1200], [800, 1067], [978, 1300], [1536, 2048],
  [800, 1067], [800, 533], [1080, 1350], [2048, 1536],
] as const;

const content = {
  en: {
    title: 'Things to Do in Fez',
    paragraphs: [
      'There is much more to do in Fez than simply visiting its famous monuments. The city is best experienced by walking through its streets, meeting local people, discovering traditional crafts, tasting local food and taking time to enjoy the different sides of the city.',
      'Start by exploring the Old Medina of Fez. Walk through its narrow streets, discover the traditional souks, visit historic places and take your time to notice the details around you. Every part of the Medina has its own atmosphere, and sometimes the best experiences are found away from the main tourist streets.',
      'Discover the traditional crafts of Fez by visiting local workshops and watching craftsmen at work. You can see skills such as zellige, leatherwork, woodwork, metalwork and other traditional crafts that have been part of the city’s identity for generations.',
      'Take time to explore the local souks and markets. You can find spices, traditional Moroccan products, handmade items, food and everyday products used by local people. The souks are not only places for shopping; they are also part of the daily life of the Medina.',
      'Food is another important part of experiencing Fez. Taste traditional Moroccan dishes, discover local ingredients and explore the flavours of the Medina. For visitors who want a deeper experience, a local food tasting tour is a great way to discover Fez through its food and everyday culture.',
      'Take a moment to discover the historic Mellah and Fes Jdid. Explore the streets around the Jewish quarter, see its distinctive architecture and learn more about the Jewish heritage that forms an important part of the history of Fez.',
      'For a different perspective, look for one of the panoramic viewpoints around Fez. Seeing the Medina from above allows you to appreciate its rooftops, minarets, walls and surrounding landscape in a completely different way.',
      'And when the day comes to an end, discover Fez at night. Head towards the New City, enjoy a café or restaurant, walk through the modern streets and experience the city after sunset.',
      'Whether you have one day or several days in Fez, the best way to experience the city is to combine its history with its everyday life. Walk, taste, explore, meet local people and take time to discover the places that make Fez different.',
    ],
    back: 'Back to Fez',
    cta: 'Explore Our Fez Experiences',
  },
  fr: {
    title: 'Que faire à Fès',
    paragraphs: [
      'À Fès, les activités ne se limitent pas à la visite des monuments célèbres. La ville se découvre en parcourant ses rues, en rencontrant les habitants, en découvrant l’artisanat traditionnel, en goûtant la cuisine locale et en prenant le temps d’apprécier ses différentes facettes.',
      'Commencez par explorer l’ancienne médina de Fès. Parcourez ses ruelles étroites, découvrez les souks traditionnels, visitez des lieux historiques et prenez le temps d’observer les détails. Chaque partie de la médina a sa propre atmosphère, et les meilleures expériences se trouvent parfois à l’écart des principales rues touristiques.',
      'Découvrez l’artisanat traditionnel de Fès en visitant les ateliers locaux et en observant les artisans au travail. Vous pourrez voir des savoir-faire comme le zellige, le travail du cuir, du bois, du métal et d’autres métiers qui font partie de l’identité de la ville depuis des générations.',
      'Prenez le temps de découvrir les souks et marchés locaux. Vous y trouverez des épices, des produits marocains traditionnels, des articles faits main, de la nourriture et des produits du quotidien. Les souks ne sont pas seulement des lieux de shopping : ils font aussi partie de la vie quotidienne de la médina.',
      'La cuisine est un autre aspect important de l’expérience de Fès. Goûtez aux plats marocains traditionnels, découvrez les ingrédients locaux et explorez les saveurs de la médina. Pour aller plus loin, une visite de dégustation culinaire avec un guide local est une belle manière de découvrir Fès à travers sa cuisine et sa vie quotidienne.',
      'Prenez le temps de découvrir le Mellah historique et Fès Jdid. Explorez les rues autour du quartier juif, observez son architecture distinctive et apprenez-en davantage sur l’héritage juif, qui occupe une place importante dans l’histoire de Fès.',
      'Pour changer de perspective, recherchez l’un des points de vue panoramiques autour de Fès. Depuis les hauteurs, les toits, les minarets, les remparts et le paysage alentour se dévoilent autrement.',
      'À la fin de la journée, découvrez Fès la nuit. Rendez-vous dans la Ville Nouvelle, profitez d’un café ou d’un restaurant, promenez-vous dans les rues modernes et découvrez la ville après le coucher du soleil.',
      'Que vous ayez un ou plusieurs jours à Fès, le mieux est de mêler son histoire à la vie quotidienne. Marchez, goûtez, explorez, rencontrez les habitants et prenez le temps de découvrir ce qui rend Fès différente.',
    ],
    back: 'Retour à Fès',
    cta: 'Explorez nos expériences à Fès',
  },
  es: {
    title: 'Qué hacer en Fez',
    paragraphs: [
      'En Fez hay mucho más que hacer que visitar sus monumentos famosos. La mejor manera de conocer la ciudad es recorrer sus calles, hablar con los vecinos, descubrir los oficios tradicionales, probar la comida local y tomarse el tiempo necesario para disfrutar de sus distintas facetas.',
      'Empieza por explorar la medina antigua de Fez. Recorre sus callejuelas, descubre los zocos tradicionales, visita lugares históricos y detente a observar los detalles que te rodean. Cada zona de la medina tiene su propio ambiente, y a veces las mejores experiencias se encuentran lejos de las calles más turísticas.',
      'Descubre los oficios tradicionales de Fez visitando talleres locales y observando a los artesanos mientras trabajan. Podrás conocer técnicas como el zellige, el trabajo del cuero, la carpintería, la metalistería y otros oficios que forman parte de la identidad de la ciudad desde hace generaciones.',
      'Dedica tiempo a recorrer los zocos y mercados locales. Encontrarás especias, productos tradicionales marroquíes, piezas hechas a mano, alimentos y artículos de uso diario. Los zocos no son solo lugares donde comprar: también forman parte de la vida cotidiana de la medina.',
      'La gastronomía es otra parte importante de la experiencia de Fez. Prueba platos tradicionales marroquíes, descubre los ingredientes locales y explora los sabores de la medina. Si quieres profundizar, un paseo de degustación con un guía local es una buena manera de conocer Fez a través de su cocina y de su cultura cotidiana.',
      'Reserva un momento para descubrir el Mellah histórico y Fez Jdid. Recorre las calles del barrio judío, observa su arquitectura característica y conoce mejor el patrimonio judío, que constituye una parte importante de la historia de Fez.',
      'Para cambiar de perspectiva, busca uno de los miradores panorámicos que rodean Fez. Contemplar la medina desde arriba te permite apreciar sus tejados, minaretes, murallas y el paisaje que la rodea de una manera completamente distinta.',
      'Y, al terminar el día, descubre Fez de noche. Acércate a la ciudad nueva, disfruta de una cafetería o un restaurante, pasea por sus calles modernas y conoce el ambiente de la ciudad después de la puesta de sol.',
      'Tanto si dispones de un día como de varios, la mejor forma de conocer Fez es combinar su historia con su vida cotidiana. Camina, prueba, explora, conoce a los vecinos y date tiempo para descubrir los lugares que hacen que Fez sea diferente.',
    ],
    back: 'Volver a Fez',
    cta: 'Descubre nuestras experiencias en Fez',
  },
};

export const ThingsToDoArticlePage: React.FC<ThingsToDoArticlePageProps> = ({ language, onBack, onNavigate, onExploreTours }) => {
  const cms = useFezEditorial('fez-things-to-do', language);
  const source = content[language];
  const copy = { ...source, title: cms.document ? cms.page?.title[cms.locale] ?? '' : source.title, paragraphs: source.paragraphs.map((paragraph, index) => cms.story(index === 0 ? 'introduction' : `story-${index}`, paragraph)) };
  const altCopy = imageAlts[language];

  return (
    <div className="bg-[#FAF8F5] pb-20">
      <PageCrumbBar
        language={language}
        parentLabel={language === 'es' ? "Fez" : language === 'fr' ? 'Fès' : 'Fez'}
        currentTitle={copy.title}
        onHome={() => onNavigate('home')}
        onParent={onBack}
      />

      <article className="editorial-story-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12 sm:space-y-16">
        <header className="max-w-3xl space-y-5">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#005F5A]">{copy.title}</h1>
          <ApprovedSection id="introduction"><p className="text-base sm:text-lg leading-relaxed text-[#445250]">{copy.paragraphs[0]}</p></ApprovedSection>
        </header>

        {cms.orderGroups(copy.paragraphs.slice(1).map((paragraph, index) => ({ paragraph, index })), ({ index }) => [`story-${index + 1}`, `gallery-${index + 1}`]).map(({ paragraph, index }) => {
          const imageIndex = index;
          return (
            <section key={index} className="space-y-7">
              <ApprovedSections>
              <ApprovedSection id={`story-${index + 1}`}><p className="editorial-story-copy max-w-3xl mx-auto text-sm sm:text-base leading-8 text-[#445250]">{paragraph}</p></ApprovedSection>
              {cms.images(`gallery-${imageIndex + 1}`, [{ src: `/images/fez-things-to-do/things-${String(imageIndex + 1).padStart(2, '0')}.jpg`, alt: altCopy[imageIndex], width: imageDimensions[imageIndex][0], height: imageDimensions[imageIndex][1] }]).map(image => <ApprovedSection id={`gallery-${imageIndex + 1}`} key={image.src}><figure className="mx-auto w-fit max-w-full overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm">
                <img
                  {...responsiveImageProps(image.src, 'min(1024px, calc(100vw - 2rem))', true)}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
                  loading={imageIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="block w-auto h-auto max-w-full max-h-[620px] object-contain"
                />
              </figure></ApprovedSection>)}
              </ApprovedSections>
            </section>
          );
        })}

        <FezToursCtaSection language={language} onExploreTours={onExploreTours} onNavigate={onNavigate} />

        <TripadvisorReviewsSection language={language} />
      </article>
    </div>
  );
};
