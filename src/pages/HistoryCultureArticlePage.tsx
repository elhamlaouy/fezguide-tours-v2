import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Language } from '../types';
import { FezToursCtaSection } from '../components/FezToursCtaSection';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';

interface HistoryCultureArticlePageProps {
  language: Language;
  onBack: () => void;
  onExploreTours: () => void;
}

const imageAlts = {
  en: [
    'Narrow alley in the old Medina of Fez',
    'Panoramic view over the city of Fez',
    'Zellige and carved details in a historic Fez courtyard',
    'Traditional goods displayed in a Fez Medina market stall',
    'Covered market lane inside the Medina of Fez',
    'Historic buildings along a street in Fez',
    'Bab Boujloud, the Blue Gate of Fez, lit at night',
    'Tiled courtyard and carved arches in a Fez madrasa',
    'Ornate arched passage in the historic Medina of Fez',
    'Traditional dye vats at the Chouara Tanneries',
    'Historic square and architecture in the Nejjarine area',
    'Historic entrance and tower in the Medina of Fez',
    'Visitors walking through a historic arcade in Fez',
    'Everyday scene on a street in the Medina of Fez',
  ],
  fr: [
    'Ruelle étroite dans l’ancienne Médina de Fès',
    'Vue panoramique sur la ville de Fès',
    'Zellige et détails sculptés dans une cour historique de Fès',
    'Produits traditionnels dans un étal de la Médina de Fès',
    'Rue commerçante couverte dans la Médina de Fès',
    'Bâtiments historiques le long d’une rue de Fès',
    'Bab Boujloud, la Porte Bleue de Fès, illuminée la nuit',
    'Cour carrelée et arches sculptées dans une médersa de Fès',
    'Passage voûté orné dans la Médina historique de Fès',
    'Cuves de teinture traditionnelles des tanneries Chouara',
    'Place historique et architecture du quartier Nejjarine',
    'Entrée historique et tour dans la Médina de Fès',
    'Visiteurs traversant une galerie historique à Fès',
    'Scène de vie quotidienne dans une rue de la Médina de Fès',
  ],
};

const imageDimensions = [
  [1080, 1440], [800, 533], [1365, 1820], [975, 1300], [1536, 2048], [1536, 2048], [1364, 908],
  [800, 1067], [800, 1200], [975, 1300], [1733, 1300], [800, 1067], [975, 1300], [975, 1300],
] as const;

const content = {
  en: {
    title: 'History, Culture & Landmarks',
    paragraphs: [
      'Fez is one of the oldest and most important cities in Morocco, and its history is still part of everyday life. When you walk through the old streets, visit a traditional workshop, enter a madrasa or pass through one of the historic gates, you are not simply visiting an old place — you are seeing a city that has been living and changing for generations.',
      'Fez was founded in the 9th century and grew over the centuries into an important centre of religion, education, trade and craftsmanship. It also became one of Morocco’s former capitals, which is why Fez is known as one of the country’s four imperial cities.',
      'One of the most important parts of Fez’s history is its tradition of learning. The city became known for religious and academic education, with mosques, madrasas and places of study attracting students and scholars from different parts of Morocco and beyond.',
      'But the culture of Fez is not only found in books and monuments. It can also be seen in the work of local craftsmen. Zellige, traditional woodwork, leather, metalwork, weaving and other crafts have been part of life in Fez for generations. While walking through the Medina, you can still see craftsmen working in small workshops and using traditional techniques.',
      'Food is another important part of the culture of Fez. Traditional recipes, spices, bread, sweets and family cooking traditions are deeply connected to everyday life. Visiting the city is therefore not only about seeing its architecture — it is also about tasting and experiencing the local culture.',
      'Fez is also a city where different parts of its history can be seen side by side. The Mellah and Fes Jdid preserve an important part of the city’s Jewish heritage, with places such as the historic synagogues, cemetery and traditional Jewish architecture. The area also reflects the relationship between the old city, the royal history of Fez and the communities that have shaped the city over time.',
      'The historic landmarks of Fez help you understand this story more clearly. Bab Boujloud, known as the Blue Gate, is one of the most recognisable entrances to the old Medina and a natural starting point for discovering the historic city.',
      'Inside the Medina, Bou Inania Madrasa shows the beauty of traditional Moroccan architecture, with detailed zellige, carved wood, plasterwork and a design that reflects the importance of education and religion in the city.',
      'Al Quaraouiyine is another important part of Fez’s history and its long tradition of learning. Around it, you can discover streets and neighbourhoods that have remained connected to the intellectual and religious life of the city.',
      'Al-Attarine Madrasa is another example of the architectural detail found throughout the Medina. Its decoration gives visitors a closer look at the craftsmanship that made Fez famous.',
      'The Chouara Tanneries show another side of the city’s traditional craftsmanship. Leather production has been part of Fez’s identity for centuries, and the tanneries remain one of the places where visitors can see this traditional work.',
      'The Nejjarine area and its traditional woodworking heritage offer another glimpse into the craftsmanship of the Medina. Walking through these streets, you begin to understand that the historic buildings and the traditional crafts are closely connected.',
      'What makes Fez different is that these landmarks are not isolated monuments. They are surrounded by streets, shops, homes, workshops, cafés and markets where people continue to live and work. History is not separated from everyday life here — it is part of it.',
      'This is why exploring Fez with a local guide can give you a different experience. A landmark may look beautiful from the outside, but knowing why it was built, what happened around it and how local people see it can make the place much more meaningful.',
      'When you visit Fez, take your time. Look beyond the famous monuments, notice the details in the architecture, listen to the sounds of the workshops, taste the local food and watch how everyday life continues around you.',
      'Fez is not a city where history is only found in museums. You can feel it in the streets, the buildings, the crafts, the food and the people.',
    ],
    imageAfter: [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 10, 11, 12, 13, null, 14] as Array<number | null>,
    back: 'Back to Fez',
    closing: 'Discover the history, culture and landmarks of Fez through local eyes.',
    cta: 'Explore Our Fez Tours',
  },
  fr: {
    title: 'Histoire, culture et monuments',
    paragraphs: [
      'Fès est l’une des villes les plus anciennes et les plus importantes du Maroc, et son histoire fait toujours partie de la vie quotidienne. En parcourant les vieilles rues, en visitant un atelier traditionnel, en entrant dans une médersa ou en franchissant une porte historique, vous ne visitez pas simplement un lieu ancien : vous découvrez une ville qui vit et évolue depuis des générations.',
      'Fès a été fondée au IXe siècle et est devenue, au fil des siècles, un important centre religieux, éducatif, commercial et artisanal. Elle fut également l’une des anciennes capitales du Maroc, ce qui explique pourquoi Fès est connue comme l’une des quatre villes impériales du pays.',
      'La tradition du savoir est l’un des aspects les plus importants de l’histoire de Fès. La ville s’est fait connaître pour son enseignement religieux et académique. Ses mosquées, ses médersas et ses lieux d’étude ont accueilli des étudiants et des érudits venus de différentes régions du Maroc et d’ailleurs.',
      'Mais la culture de Fès ne se trouve pas seulement dans les livres et les monuments. Elle se voit aussi dans le travail des artisans locaux. Le zellige, le travail traditionnel du bois, du cuir et du métal, le tissage et d’autres métiers font partie de la vie à Fès depuis des générations. Dans la Médina, on peut encore voir des artisans travailler dans de petits ateliers avec des techniques traditionnelles.',
      'La cuisine est un autre aspect important de la culture de Fès. Les recettes traditionnelles, les épices, le pain, les pâtisseries et les traditions culinaires familiales sont profondément liées à la vie quotidienne. Visiter la ville, ce n’est donc pas seulement admirer son architecture : c’est aussi goûter et découvrir la culture locale.',
      'À Fès, différentes périodes de l’histoire se côtoient. Le Mellah et Fès Jdid préservent une part importante du patrimoine juif de la ville, avec des synagogues historiques, un cimetière et une architecture juive traditionnelle. Le quartier reflète aussi les liens entre la vieille ville, l’histoire royale de Fès et les communautés qui l’ont façonnée au fil du temps.',
      'Les monuments historiques de Fès permettent de mieux comprendre cette histoire. Bab Boujloud, surnommée la Porte Bleue, est l’une des entrées les plus reconnaissables de l’ancienne Médina et un point de départ naturel pour découvrir la ville historique.',
      'Au cœur de la Médina, la médersa Bou Inania révèle la beauté de l’architecture marocaine traditionnelle, avec ses zelliges détaillés, son bois sculpté, ses stucs et un plan qui témoigne de l’importance de l’éducation et de la religion dans la ville.',
      'Al Quaraouiyine occupe également une place importante dans l’histoire de Fès et dans sa longue tradition du savoir. Dans les rues et les quartiers alentour, on découvre des lieux toujours liés à la vie intellectuelle et religieuse de la ville.',
      'La médersa Al-Attarine est un autre exemple des détails architecturaux que l’on trouve dans toute la Médina. Son décor permet d’observer de près le savoir-faire qui a rendu Fès célèbre.',
      'Les tanneries Chouara révèlent une autre facette de l’artisanat traditionnel de la ville. Le travail du cuir fait partie de l’identité de Fès depuis des siècles, et les tanneries restent l’un des lieux où les visiteurs peuvent observer ce savoir-faire.',
      'Le quartier Nejjarine et son héritage du travail traditionnel du bois offrent un autre aperçu de l’artisanat de la Médina. En parcourant ses rues, on comprend peu à peu que les bâtiments historiques et les métiers traditionnels sont étroitement liés.',
      'Ce qui distingue Fès, c’est que ses monuments ne sont pas isolés. Ils sont entourés de rues, de boutiques, de maisons, d’ateliers, de cafés et de marchés où les habitants continuent de vivre et de travailler. Ici, l’histoire ne se sépare pas de la vie quotidienne : elle en fait partie.',
      'C’est pourquoi découvrir Fès avec un guide local peut offrir une expérience différente. Un monument peut être beau vu de l’extérieur, mais savoir pourquoi il a été construit, ce qui s’est passé autour de lui et comment les habitants le perçoivent peut lui donner beaucoup plus de sens.',
      'Lors de votre visite à Fès, prenez votre temps. Regardez au-delà des monuments célèbres, remarquez les détails de l’architecture, écoutez les bruits des ateliers, goûtez la cuisine locale et observez la vie quotidienne qui se poursuit autour de vous.',
      'À Fès, l’histoire ne se trouve pas uniquement dans les musées. On la ressent dans les rues, les bâtiments, l’artisanat, la cuisine et les habitants.',
    ],
    imageAfter: [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 10, 11, 12, 13, null, 14] as Array<number | null>,
    back: 'Retour à Fès',
    closing: 'Découvrez l’histoire, la culture et les monuments de Fès à travers des yeux locaux.',
    cta: 'Explorer nos visites de Fès',
  },
};

export const HistoryCultureArticlePage: React.FC<HistoryCultureArticlePageProps> = ({ language, onBack, onExploreTours }) => {
  const copy = language === 'fr' ? content.fr : content.en;
  const fallbackEnglish = language === 'ar';
  const altCopy = language === 'fr' ? imageAlts.fr : imageAlts.en;

  return (
    <div className="bg-[#FAF8F5] pb-20" dir={fallbackEnglish ? 'ltr' : undefined}>
      <div className="border-b border-[#E7E2DA] bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-[#005F5A] hover:text-[#C84B31] cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> {copy.back}
          </button>
        </div>
      </div>

      <article className="editorial-story-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12 sm:space-y-16">
        <header className="max-w-3xl space-y-5">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#005F5A]">{copy.title}</h1>
          <p className="text-base sm:text-lg leading-relaxed text-[#445250]">{copy.paragraphs[0]}</p>
        </header>

        <figure className="mx-auto w-fit max-w-full overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm">
          <img
            src="/images/fez-history/history-01.jpg"
            alt={altCopy[0]}
            width={imageDimensions[0][0]}
            height={imageDimensions[0][1]}
            loading="eager"
            decoding="async"
            className="block w-auto h-auto max-w-full max-h-[620px] object-contain"
          />
        </figure>

        {copy.paragraphs.slice(1).map((paragraph, index) => {
          const imageIndex = copy.imageAfter[index + 1];
          return (
            <section key={index} className="space-y-7">
              <p className="editorial-story-copy max-w-3xl mx-auto text-sm sm:text-base leading-8 text-[#445250]">{paragraph}</p>
              {imageIndex !== null && imageIndex !== undefined && (
                <figure className="mx-auto w-fit max-w-full overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm">
                  <img
                    src={`/images/fez-history/history-${String(imageIndex).padStart(2, '0')}.jpg`}
                    alt={altCopy[imageIndex - 1]}
                    width={imageDimensions[imageIndex - 1][0]}
                    height={imageDimensions[imageIndex - 1][1]}
                    loading={imageIndex === 1 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="block w-auto h-auto max-w-full max-h-[620px] object-contain"
                  />
                </figure>
              )}
            </section>
          );
        })}

        <FezToursCtaSection language={fallbackEnglish ? 'en' : language} onExploreTours={onExploreTours} />

        <TripadvisorReviewsSection language={language === 'fr' ? 'fr' : 'en'} />
      </article>
    </div>
  );
};
