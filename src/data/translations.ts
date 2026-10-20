import { Language, PageId, SectionPillar, TeamMember, FaqItem, BlogPost, CustomPage } from '../types';
export { UI_TEXT, DEFAULT_SITE_SETTINGS, DEFAULT_BLOG_POSTS, DEFAULT_CUSTOM_PAGES } from './shared-ui';


// 1. FEZ MEDINA EXPERIENCES
export const FEZ_PILLARS: SectionPillar[] = [
  {
    id: 'fez-explore-medina',
    pageId: 'fez',
    title: {
      en: 'Explore the Medina',
      fr: 'Explorer la Médina',
      es: 'Descubre la medina',
    },
    subtitle: {
      en: 'Medina Guide',
      fr: 'Guide de la Médina',
      es: 'Guía de la medina',
    },
    shortDescription: {
      en: 'Understand the Medina through its historic lanes, artisan workshops, and everyday life.',
      fr: 'Comprenez la Médina à travers ses ruelles historiques, ses ateliers d’artisans et la vie quotidienne.',
      es: 'Conoce la medina a través de sus callejuelas históricas, sus talleres artesanales y su vida cotidiana.',
    },
    fullDescription: {
      en: 'Explore the Medina through the supplied story, photographs and local perspective.',
      fr: 'Explorez la Médina à travers le récit, les photographies et le regard local fournis.',
      es: 'Descubre la medina a través del relato, las fotografías y la perspectiva local que compartimos.',
    },
    highlights: {
      en: ['Historic lanes, gates & souks', 'Workshops & everyday life'],
      fr: ['Ruelles, portes historiques et souks', 'Ateliers d’artisans et vie quotidienne'],
      es: ['Callejuelas, puertas históricas y zocos', 'Talleres artesanales y vida cotidiana'],
    },
    image: '/images/fez-medina/medina-01.jpg',
    imageAlt: {
      en: 'Traditional Fez Medina market lane with Moroccan flags',
      fr: 'Ruelle traditionnelle de la Médina de Fès avec des drapeaux marocains',
      es: 'Callejuela de un mercado tradicional de la medina de Fez con banderas marroquíes',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'fez-history-landmarks',
    pageId: 'fez',
    title: {
      en: 'History, Culture & Landmarks',
      fr: 'Histoire, Culture & Grands Monuments',
      es: 'Historia, cultura y monumentos',
    },
    subtitle: {
      en: 'History & Culture',
      fr: 'Histoire & Culture',
      es: 'Historia y cultura',
    },
    shortDescription: {
      en: 'Trace Fez’s history through its madrasas, landmarks, traditional crafts, and historic neighbourhoods.',
      fr: 'Suivez l’histoire de Fès à travers ses médersas, monuments, métiers d’art et quartiers historiques.',
      es: 'Recorre la historia de Fez a través de sus madrasas, monumentos, oficios tradicionales y barrios históricos.',
    },
    fullDescription: {
      en: 'Fez’s history is part of everyday life. Discover the city’s learning traditions, historic gates and madrasas, crafts, food, Mellah and Fes Jdid, and Chouara Tanneries through local eyes.',
      fr: 'À Fès, l’histoire fait partie de la vie quotidienne. Découvrez ses traditions du savoir, ses portes et médersas historiques, son artisanat, sa cuisine, le Mellah et Fès Jdid, ainsi que les tanneries Chouara à travers des yeux locaux.',
      es: `En Fez, los grandes monumentos no están aislados: forman parte de la vida cotidiana. Desde la universidad de Al Quaraouiyine, fundada en el año 859, hasta la arquitectura meriní de las madrasas Al Attarine y Bou Inania y las curtidurías Chouara, que siguen utilizando métodos naturales centenarios, descubre el patrimonio de la ciudad con una mirada local.`
    },
    highlights: {
      en: ['Madrasas & historic landmarks', 'Mellah, Fes Jdid & traditional crafts'],
      fr: ['Médersas et monuments historiques', 'Mellah, Fès Jdid et artisanat traditionnel'],
      es: ['Madrasas y monumentos históricos', 'Mellah, Fes Jdid y oficios tradicionales']
    },
    image: '/images/fez-history/history-01.jpg',
    imageAlt: {
      en: 'Narrow alley in the old Medina of Fez',
      fr: 'Ruelle étroite dans l’ancienne Médina de Fès',
      es: 'Callejuela estrecha de la antigua medina de Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'fez-things-to-do',
    pageId: 'fez',
    title: {
      en: 'Things to Do in Fez',
      fr: 'Que Faire à Fès : Expériences & Activités',
      es: 'Qué hacer en Fez',
    },
    subtitle: {
      en: 'Fez City Guide',
      fr: 'Guide de Fès',
      es: 'Guía de Fez',
    },
    shortDescription: {
      en: 'Plan a visit around the souks, craft workshops, local food, panoramic views, and evenings in Fez.',
      fr: 'Organisez votre séjour entre souks, ateliers, cuisine locale, panoramas et soirées dans la Ville Nouvelle.',
      es: 'Organiza tu visita entre zocos, talleres artesanales, gastronomía local, vistas panorámicas y noches en Fez.',
    },
    fullDescription: {
      en: `There is much more to do in Fez than simply visiting its famous monuments. The city is best experienced by walking through its streets, meeting local people, discovering traditional crafts, tasting local food and taking time to enjoy the different sides of the city.

Start by exploring the Old Medina of Fez. Walk through its narrow streets, discover the traditional souks, visit historic places and take your time to notice the details around you. Every part of the Medina has its own atmosphere, and sometimes the best experiences are found away from the main tourist streets.

Discover the traditional crafts of Fez by visiting local workshops and watching craftsmen at work. You can see skills such as zellige, leatherwork, woodwork, metalwork and other traditional crafts that have been part of the city's identity for generations.

Take time to explore the historic Mellah and Fes Jdid, enjoy a panoramic view over the Medina walls at sunset, and experience the lively cafés of the New City at night.`,
      fr: `Explorez les ateliers de zellige, de dinanderie et de cuir. Parcourez le quartier historique du Mellah et terminez votre journée devant un coucher de soleil sur les collines mérinides.`,
      es: `En Fez hay mucho más que hacer que visitar sus monumentos más conocidos. La mejor forma de vivir la ciudad es recorrer sus calles, conocer a sus habitantes, descubrir los oficios tradicionales, probar la gastronomía local y disfrutar con calma de sus distintas facetas.

Empieza por la antigua medina de Fez. Pasea por sus callejuelas, descubre los zocos tradicionales, visita lugares históricos y fíjate en los detalles que te rodean. Cada zona tiene su propio ambiente y, a veces, las mejores experiencias se encuentran lejos de las principales calles turísticas.

Visita los talleres locales y observa a los artesanos trabajar el zellige, el cuero, la madera y el metal. Son oficios que forman parte de la identidad de la ciudad desde hace generaciones.

Dedica tiempo al histórico Mellah y a Fes Jdid, disfruta de una vista panorámica sobre las murallas de la medina al atardecer y conoce los animados cafés de la ciudad nueva por la noche.`
    },
    highlights: {
      en: ['Souks, workshops & Moroccan food', 'Panoramic views & Fez after dark'],
      fr: ['Souks, ateliers et cuisine marocaine', 'Panoramas et Fès après le coucher du soleil'],
      es: ['Zocos, talleres y gastronomía marroquí', 'Vistas panorámicas y Fez por la noche']
    },
    image: '/images/fez-things-to-do/things-01.jpg',
    imageAlt: {
      en: 'Busy souk lane in the old Medina of Fez',
      fr: 'Allée animée d’un souk dans l’ancienne médina de Fès',
      es: 'Callejuela animada de un zoco en la antigua medina de Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'our-fez-tours',
    pageId: 'fez',
    title: {
      en: 'Our Fez Tours',
      fr: 'Nos Visites de Fès',
      es: 'Nuestras visitas por Fez',
    },
    subtitle: {
      en: 'Private Walking Tour',
      fr: 'Visite privée à pied',
      es: 'Visita privada a pie',
    },
    shortDescription: {
      en: 'Walk the Medina privately with a local guide and discover its stories, crafts, and hidden corners.',
      fr: 'Parcourez la Médina avec un guide local et découvrez ses histoires, métiers d’art et passages cachés.',
      es: 'Recorre la medina en una visita privada con un guía local y descubre sus historias, oficios y rincones escondidos.',
    },
    fullDescription: {
      en: 'Explore our Fez tours and discover the city through local eyes.',
      fr: 'Explorez nos visites de Fès et découvrez la ville à travers des yeux locaux.',
      es: 'Conoce nuestras visitas por Fez y descubre la ciudad con quienes viven en ella.',
    },
    highlights: {
      en: ['Private walking tour · 3–5 hours', 'English, Français and Español'],
      fr: ['Visite privée à pied · 3–5 heures', 'Anglais, français et espagnol'],
      es: ['Visita privada a pie · 3–5 horas', 'Inglés, francés y español'],
    },
    practicalInfo: {
      priceEUR: 170,
      priceMAD: 1900,
      priceUSD: 191,
    },
    image: '/images/fez-medina/medina-14.jpg',
    imageAlt: {
      en: 'Guide with visitors at a historic Fez monument',
      fr: 'Guide avec des visiteurs devant un monument historique de Fès',
      es: 'Guía con visitantes junto a un monumento histórico de Fez',
    },
    actionType: 'book_tour',
    published: true,
  },
];

// 2. DAY TRIPS BEYOND FEZ
export const DAY_TRIPS_PILLARS: SectionPillar[] = [
  {
    id: 'daytrip-chefchaouen',
    pageId: 'day-trips',
    title: {
      en: 'Chefchaouen Day Trip from Fez',
      fr: 'Excursion à Chefchaouen au départ de Fès',
      es: 'Excursión de un día a Chefchaouen desde Fez',
    },
    subtitle: {
      en: 'The Famous Blue City of Northern Morocco in the Rif Mountains',
      fr: 'La Perle Bleue du Nord du Maroc au cœur du Rif',
      es: 'La famosa ciudad azul del norte de Marruecos, en las montañas del Rif',
    },
    shortDescription: {
      en: 'Spend a day discovering Chefchaouen, the famous Blue City of northern Morocco, surrounded by the Rif Mountains.',
      fr: 'Passez une journée à découvrir Chefchaouen, la célèbre ville bleue du nord du Maroc, au cœur des montagnes du Rif.',
      es: 'Dedica un día a descubrir Chefchaouen, la famosa ciudad azul del norte de Marruecos, rodeada por las montañas del Rif.',
    },
    fullDescription: {
      en: `Spend a day discovering Chefchaouen, the famous Blue City of northern Morocco, surrounded by the Rif Mountains.

After leaving Fez, the journey takes you through the Moroccan countryside and mountain landscapes before arriving in Chefchaouen. Once there, the experience begins with a walk through the old town, where blue-painted walls, small streets and traditional houses create the atmosphere Chefchaouen is known for.

Depending on the route and time available, you can discover some of the city's main places, including Plaza Uta el-Hammam, the heart of the old town, where you can sit for a Moroccan tea, watch local life and enjoy the atmosphere around the historic Kasbah.

From there, continue through the narrow blue streets towards the Kasbah of Chefchaouen, one of the city's historic landmarks, and explore the surrounding old neighbourhoods, small shops and traditional houses.

You can also walk towards Ras El Maa, the natural spring at the edge of the old town. This is one of the pleasant places to slow down, see the water flowing from the mountains and observe a more local side of Chefchaouen.

There is also time to explore the small streets, discover local handicrafts, stop for photographs and enjoy lunch in the old town. We do not want you to feel rushed from one attraction to another, so the driver remains flexible and we take the time available to enjoy the destination.

You can make the trip with a private driver only, or choose to have a local guide with you to explain the history, culture and places you visit.`,
      fr: `Passez une journée à découvrir Chefchaouen, la célèbre ville bleue du nord du Maroc, entourée par les montagnes du Rif.

Après le départ de Fès, le trajet traverse la campagne marocaine et les paysages de montagne avant d’arriver à Chefchaouen. Là, la visite commence par une marche dans la vieille ville, où les murs bleus, les petites rues et les maisons traditionnelles créent l’atmosphère pour laquelle Chefchaouen est connue.

Selon le parcours et le temps disponible, vous pouvez découvrir quelques lieux principaux, dont la Plaza Uta el-Hammam, le cœur de la vieille ville, où l’on peut prendre un thé, observer la vie locale et profiter de l’ambiance autour de la Kasbah historique.

De là, continuez par les ruelles bleues vers la Kasbah de Chefchaouen, l’un des monuments de la ville, puis les vieux quartiers, les petites boutiques et les maisons traditionnelles.

Vous pouvez aussi marcher jusqu’à Ras El Maa, la source naturelle au bord de la vieille ville. C’est un endroit agréable pour ralentir, voir l’eau qui descend de la montagne et observer un côté plus local de Chefchaouen.

Il reste aussi du temps pour les petites rues, l’artisanat, les photos et le déjeuner dans la vieille ville. Nous ne voulons pas vous presser d’une attraction à l’autre : le chauffeur reste flexible et nous prenons le temps disponible pour profiter de la destination.

Vous pouvez faire le trajet avec un chauffeur privé seulement, ou choisir un guide local pour expliquer l’histoire, la culture et les lieux visités.`,
      es: `Dedica un día a descubrir Chefchaouen, la famosa ciudad azul del norte de Marruecos, rodeada por las montañas del Rif.

Tras salir de Fez, el trayecto atraviesa el campo marroquí y paisajes de montaña antes de llegar a Chefchaouen. Allí, la experiencia comienza con un paseo por el casco antiguo, donde las paredes azules, las callejuelas y las casas tradicionales crean el ambiente por el que se conoce la ciudad.

Según la ruta y el tiempo disponible, puedes descubrir algunos de sus lugares principales, como la Plaza Uta el-Hammam, el corazón del casco antiguo. Allí podrás sentarte a tomar un té marroquí, observar la vida local y disfrutar del ambiente alrededor de la histórica Kasbah.

Desde allí, continúa por las estrechas calles azules hacia la Kasbah de Chefchaouen, uno de los monumentos históricos de la ciudad, y explora los barrios antiguos de los alrededores, sus pequeñas tiendas y sus casas tradicionales.

También puedes caminar hasta Ras El Maa, el manantial natural situado al borde del casco antiguo. Es un lugar agradable para hacer una pausa, ver el agua que baja de las montañas y conocer una faceta más local de Chefchaouen.

Queda tiempo para recorrer las callejuelas, descubrir la artesanía local, hacer fotografías y comer en el casco antiguo. No queremos que vayas con prisas de un lugar a otro: el conductor mantiene un horario flexible y aprovechamos el tiempo disponible para disfrutar del destino.

Puedes hacer la excursión solo con un conductor privado o elegir que te acompañe un guía local para explicar la historia, la cultura y los lugares que visites.`
    },
    highlights: {
      en: [
        'Private day trip · Comfortable vehicle · Flexible timing',
        'Driver only, or driver plus a local guide',
        'Blue streets, Plaza Uta el-Hammam, and the historic Kasbah',
        'Ras El Maa, the mountain spring at the edge of town',
        'Explore Chefchaouen at your own pace'
      ],
      fr: [
        'Journée privée · véhicule confortable · rythme flexible',
        'Chauffeur seul, ou chauffeur et guide local',
        'Ruelles bleues, Plaza Uta el-Hammam et la Kasbah historique',
        'Ras El Maa, la source au bord de la vieille ville',
        'Découvrir Chefchaouen à votre rythme'
      ],
      es: [
        'Excursión privada de un día · Vehículo cómodo · Horario flexible',
        'Solo conductor o conductor con guía local',
        'Calles azules, Plaza Uta el-Hammam y la histórica Kasbah',
        'Ras El Maa, el manantial de montaña junto al casco antiguo',
        'Descubre Chefchaouen a tu ritmo'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~10-11 Hours)', fr: 'Journée entière (~10-11h)', es: 'Día completo (unas 10-11 horas)' },
      departure: { en: '8:00 AM from Fez (Hotel / Riad)', fr: '8h00 de Fès (Hôtel / Riad)', es: 'A las 8:00 desde Fez (hotel / riad)' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', es: 'Vehículo privado (de 1 a 6 pasajeros)' },
      priceMAD: 1400,
      priceEUR: 130,
    },
    image: '/images/daytrip-chefchaouen/blue-alley.webp',
    imageAlt: {
      en: 'Blue alley in Chefchaouen with a studded door and a person walking under an umbrella',
      fr: 'Ruelle bleue de Chefchaouen, porte cloutée et personne marchant sous un parapluie',
      es: 'Callejuela azul de Chefchaouen con una puerta claveteada y una persona caminando bajo un paraguas',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'daytrip-meknes',
    pageId: 'day-trips',
    title: {
      en: 'Meknes, Volubilis & Moulay Idriss Day Trip from Fez',
      fr: 'Excursion Meknès, Volubilis et Moulay Idriss au départ de Fès',
      es: 'Excursión de un día a Meknes, Volubilis y Moulay Idriss desde Fez',
    },
    subtitle: {
      en: 'Discover Roman history, Moroccan heritage and an imperial city in one day.',
      fr: 'Découvrir l’histoire romaine, le patrimoine marocain et une ville impériale en une journée.',
      es: 'Descubre la historia romana, el patrimonio marroquí y una ciudad imperial en un solo día.',
    },
    shortDescription: {
      en: 'Discover three different sides of Morocco’s history in one private day trip from Fez, combining the ancient Roman ruins of Volubilis, the holy town of Moulay Idriss and the historic imperial city of Meknes.',
      fr: 'Découvrez trois facettes de l’histoire du Maroc en une excursion privée au départ de Fès : les ruines romaines de Volubilis, la ville sainte de Moulay Idriss et la cité impériale de Meknès.',
      es: 'Descubre tres facetas de la historia de Marruecos en una excursión privada de un día desde Fez: las antiguas ruinas romanas de Volubilis, la ciudad santa de Moulay Idriss y la histórica ciudad imperial de Meknes.',
    },
    fullDescription: {
      en: `Discover three different sides of Morocco's history in one private day trip from Fez, combining the ancient Roman ruins of Volubilis, the holy town of Moulay Idriss and the historic imperial city of Meknes.

Your first stop can be Volubilis, one of Morocco's most important archaeological sites. Walk among the remains of the ancient Roman city, discover its old streets and buildings, and take time to admire the famous mosaics that have survived for centuries. The site gives you a different perspective on Morocco's history, long before the cities and monuments we know today.

From Volubilis, continue towards Moulay Idriss Zerhoun, a small town built across the hills and known as an important pilgrimage destination in Morocco. Its white houses, narrow streets and hillside setting give it a very different atmosphere from the larger Moroccan cities. Depending on the time available, you can walk through part of the town, enjoy the views and discover its connection to the early history of Morocco.

The journey then continues to Meknes, one of Morocco's four imperial cities. Here you can explore the historic heart of the city, walk around Bab Mansour, one of its best-known monumental gates, and discover the old medina, historic walls and traditional streets.

Depending on the opening hours and your interests, you can also visit some of Meknes' historic sites and learn more about the period when the city became an important royal capital under Sultan Moulay Ismail.

The order and timing of the visits can remain flexible during the day. You can spend more time at a place that interests you, stop for lunch or photographs, and enjoy the journey without feeling rushed.

You can travel with a private driver only, or choose to have a local guide with you for a deeper explanation of the history, architecture and culture of the places you visit.`,
      fr: `Découvrez trois facettes de l’histoire du Maroc en une excursion privée au départ de Fès : les ruines romaines de Volubilis, la ville sainte de Moulay Idriss et la cité impériale de Meknès.

Le premier arrêt peut être Volubilis, l’un des sites archéologiques les plus importants du Maroc. Marchez parmi les vestiges de la cité romaine, découvrez ses anciennes rues et ses bâtiments, et prenez le temps d’admirer les mosaïques célèbres qui ont traversé les siècles. Le site donne un autre regard sur l’histoire du Maroc, bien avant les villes et les monuments que nous connaissons aujourd’hui.

Depuis Volubilis, continuez vers Moulay Idriss Zerhoun, une petite ville bâtie sur les collines et connue comme un important lieu de pèlerinage au Maroc. Ses maisons blanches, ses ruelles et son cadre en pente lui donnent une atmosphère très différente des plus grandes villes marocaines. Selon le temps disponible, vous pouvez parcourir une partie de la ville, profiter des vues et découvrir son lien avec les débuts de l’histoire du Maroc.

Le voyage se poursuit ensuite vers Meknès, l’une des quatre villes impériales du Maroc. Vous pouvez explorer le cœur historique de la ville, faire le tour de Bab Mansour, l’une de ses portes monumentales les plus connues, et découvrir l’ancienne médina, les remparts et les rues traditionnelles.

Selon les horaires d’ouverture et vos intérêts, vous pouvez aussi visiter certains sites historiques de Meknès et en apprendre davantage sur la période où la ville est devenue une importante capitale royale sous le sultan Moulay Ismaïl.

L’ordre et le rythme des visites peuvent rester souples pendant la journée. Vous pouvez rester plus longtemps là où cela vous intéresse, vous arrêter pour le déjeuner ou des photos, et profiter du trajet sans vous sentir pressé.

Vous pouvez voyager avec un chauffeur privé seulement, ou choisir un guide local pour une explication plus approfondie de l’histoire, de l’architecture et de la culture des lieux visités.`,
      es: `Descubre tres facetas de la historia de Marruecos en una excursión privada de un día desde Fez: las antiguas ruinas romanas de Volubilis, la ciudad santa de Moulay Idriss y la histórica ciudad imperial de Meknes.

La primera parada puede ser Volubilis, uno de los yacimientos arqueológicos más importantes de Marruecos. Pasea entre los restos de la antigua ciudad romana, descubre sus calles y edificios y admira los famosos mosaicos que han sobrevivido durante siglos. El yacimiento ofrece otra perspectiva de la historia de Marruecos, mucho antes de las ciudades y monumentos que conocemos hoy.

Desde Volubilis, continúa hacia Moulay Idriss Zerhoun, una pequeña ciudad construida sobre las colinas y conocida como un importante destino de peregrinación en Marruecos. Sus casas blancas, callejuelas y emplazamiento en la ladera le dan un ambiente muy distinto al de las grandes ciudades marroquíes. Según el tiempo disponible, puedes recorrer parte de la ciudad, disfrutar de las vistas y conocer su relación con los primeros tiempos de la historia de Marruecos.

El recorrido continúa hacia Meknes, una de las cuatro ciudades imperiales de Marruecos. Aquí puedes explorar su centro histórico, pasear junto a Bab Mansour, una de sus puertas monumentales más conocidas, y descubrir la antigua medina, las murallas y las calles tradicionales.

Según los horarios de apertura y tus intereses, también puedes visitar otros lugares históricos de Meknes y conocer la época en la que la ciudad se convirtió en una importante capital real bajo el sultán Moulay Ismail.

El orden y el horario de las visitas pueden mantenerse flexibles durante el día. Puedes dedicar más tiempo a un lugar que te interese, parar para comer o hacer fotografías y disfrutar del recorrido sin prisas.

Puedes viajar solo con un conductor privado o elegir que te acompañe un guía local para conocer con más detalle la historia, la arquitectura y la cultura de los lugares que visites.`
    },
    highlights: {
      en: [
        'Private day trip',
        'Comfortable vehicle',
        'Flexible timing',
        'Driver only, or driver plus a local guide',
        'Discover Roman history, Moroccan heritage and an imperial city in one day'
      ],
      fr: [
        'Excursion privée',
        'Véhicule confortable',
        'Horaire flexible',
        'Chauffeur seul, ou chauffeur et guide local',
        'Découvrir l’histoire romaine, le patrimoine marocain et une ville impériale en une journée'
      ],
      es: [
        'Excursión privada de un día',
        'Vehículo cómodo',
        'Horario flexible',
        'Solo conductor o conductor con guía local',
        'Historia romana, patrimonio marroquí y una ciudad imperial en un solo día'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~8 Hours)', fr: 'Journée entière (~8h)', es: 'Día completo (unas 8 horas)' },
      departure: { en: '9:00 AM from Fez', fr: '9h00 de Fès', es: 'A las 9:00 desde Fez' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', es: 'Vehículo privado (de 1 a 6 pasajeros)' },
      priceMAD: 1100,
      priceEUR: 100,
    },
    image: '/images/daytrip-meknes/bab-mansour.webp',
    imageAlt: {
      en: 'Volubilis, Moulay Idriss and Meknes',
      fr: 'Volubilis, Moulay Idriss et Meknès',
      es: 'Volubilis, Moulay Idriss y Meknes',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'daytrip-ifrane',
    pageId: 'day-trips',
    title: {
      en: 'Ifrane & Middle Atlas Day Trip from Fez',
      fr: 'Excursion Ifrane et Moyen Atlas au départ de Fès',
      es: 'Excursión de un día a Ifrane y el Atlas Medio desde Fez',
    },
    subtitle: {
      en: 'Discover the mountains and landscapes beyond Fez.',
      fr: 'Découvrir les montagnes et les paysages au-delà de Fès.',
      es: 'Descubre las montañas y los paisajes más allá de Fez.',
    },
    shortDescription: {
      en: 'Leave the historic streets of Fez behind and spend a day discovering a completely different side of Morocco in Ifrane and the Middle Atlas.',
      fr: 'Laissez les rues historiques de Fès et passez une journée à découvrir une autre facette du Maroc, à Ifrane et dans le Moyen Atlas.',
      es: 'Deja atrás las calles históricas de Fez y dedica un día a descubrir una faceta muy distinta de Marruecos en Ifrane y el Atlas Medio.',
    },
    fullDescription: {
      en: `Leave the historic streets of Fez behind and spend a day discovering a completely different side of Morocco in Ifrane and the Middle Atlas.

The journey takes you gradually from the city towards the mountains, where the landscape becomes greener and cooler. One of the first places to discover is Ifrane, known for its distinctive architecture, clean streets, green spaces and mountain atmosphere. The city feels very different from the traditional streets of Fez, which makes the journey an interesting change of scenery.

During your time in Ifrane, you can explore the town, walk around its central areas and see some of its best-known features, including the famous stone lion statue, which has become one of the symbols associated with the city.

From Ifrane, the journey continues towards the Middle Atlas, where forests, mountains and countryside create a completely different landscape. Depending on the season, weather and road conditions, there may be opportunities for scenic stops, photographs and short walks along the way.

The experience is not only about reaching a particular point. The road itself is part of the day, giving you the chance to see another side of Morocco and enjoy landscapes that are very different from those around Fez.

Your private driver remains flexible throughout the trip, allowing you to take your time at the places you visit and make suitable stops along the way. If you would like to learn more about the region, its landscapes and local life, you can also choose to travel with a local guide.`,
      fr: `Laissez les rues historiques de Fès et passez une journée à découvrir une autre facette du Maroc, à Ifrane et dans le Moyen Atlas.

Le trajet vous mène peu à peu de la ville vers les montagnes, où le paysage devient plus vert et plus frais. L’un des premiers endroits à découvrir est Ifrane, connue pour son architecture particulière, ses rues propres, ses espaces verts et son atmosphère de montagne. La ville est très différente des rues traditionnelles de Fès, ce qui fait du trajet un vrai changement de décor.

À Ifrane, vous pouvez explorer la ville, vous promener dans ses quartiers centraux et voir certains de ses repères, dont la célèbre statue du lion de pierre, devenue l’un des symboles associés à la ville.

Depuis Ifrane, le voyage continue vers le Moyen Atlas, où forêts, montagnes et campagne créent un paysage complètement différent. Selon la saison, le temps et l’état des routes, il peut y avoir des arrêts pour les vues, des photos et de courtes marches.

L’expérience ne consiste pas seulement à atteindre un point précis. La route fait partie de la journée. Elle vous permet de voir une autre face du Maroc et des paysages très différents de ceux autour de Fès.

Votre chauffeur privé reste flexible tout au long du trajet, pour que vous preniez votre temps et fassiez les arrêts qui conviennent. Si vous voulez en savoir plus sur la région, ses paysages et la vie locale, vous pouvez aussi voyager avec un guide local.`,
      es: `Deja atrás las calles históricas de Fez y dedica un día a descubrir una faceta muy distinta de Marruecos en Ifrane y el Atlas Medio.

El trayecto te lleva poco a poco de la ciudad hacia las montañas, donde el paisaje se vuelve más verde y fresco. Uno de los primeros lugares que puedes descubrir es Ifrane, conocida por su arquitectura singular, sus calles limpias, sus espacios verdes y su ambiente de montaña. La ciudad es muy distinta de las calles tradicionales de Fez, por lo que la excursión supone un interesante cambio de escenario.

En Ifrane puedes recorrer la ciudad, pasear por sus zonas céntricas y ver algunos de sus lugares más conocidos, como la famosa estatua del león de piedra, que se ha convertido en uno de sus símbolos.

Desde Ifrane, el recorrido continúa hacia el Atlas Medio, donde los bosques, las montañas y el campo crean un paisaje completamente diferente. Según la estación, el tiempo y el estado de las carreteras, puede haber ocasiones para parar a disfrutar de las vistas, hacer fotografías y dar pequeños paseos.

La experiencia no consiste solo en llegar a un lugar concreto. El propio trayecto forma parte del día y te permite conocer otra faceta de Marruecos y disfrutar de paisajes muy distintos a los de los alrededores de Fez.

Tu conductor privado mantiene la flexibilidad durante toda la excursión para que puedas disfrutar con calma de cada lugar y hacer las paradas que convengan. Si quieres saber más sobre la región, sus paisajes y la vida local, también puedes elegir viajar con un guía local.`
    },
    highlights: {
      en: [
        'Private day trip',
        'Comfortable vehicle',
        'Flexible stops',
        'Driver only, or driver plus a local guide',
        'Discover the mountains and landscapes beyond Fez'
      ],
      fr: [
        'Excursion privée',
        'Véhicule confortable',
        'Arrêts flexibles',
        'Chauffeur seul, ou chauffeur et guide local',
        'Découvrir les montagnes et les paysages au-delà de Fès'
      ],
      es: [
        'Excursión privada de un día',
        'Vehículo cómodo',
        'Paradas flexibles',
        'Solo conductor o conductor con guía local',
        'Descubre las montañas y los paisajes más allá de Fez'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~7-8 Hours)', fr: 'Journée (~7-8h)', es: 'Día completo (unas 7-8 horas)' },
      departure: { en: '9:00 AM from Fez', fr: '9h00 de Fès', es: 'A las 9:00 desde Fez' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', es: 'Vehículo privado (de 1 a 6 pasajeros)' },
      priceMAD: 1100,
      priceEUR: 100,
    },
    image: '/images/daytrip-ifrane/mountain-countryside.webp',
    imageAlt: {
      en: 'Ifrane and the Middle Atlas',
      fr: 'Ifrane et le Moyen Atlas',
      es: 'Ifrane y el Atlas Medio',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'daytrip-custom',
    pageId: 'day-trips',
    title: {
      en: 'Custom Private Day Trip from Fez',
      fr: 'Excursion Privée Sur Mesure au départ de Fès',
      es: 'Excursión privada de un día a medida desde Fez',
    },
    subtitle: {
      en: 'Have Somewhere Specific in Mind? Design Your Own Day',
      fr: 'Une destination précise en tête ? Créez votre journée idéale',
      es: '¿Tienes un destino en mente? Diseña tu propio día',
    },
    shortDescription: {
      en: 'Have somewhere specific in mind? We can also organize a private day trip around your own interests.',
      fr: 'Vous avez une idée précise ? Nous pouvons aussi organiser une excursion privée autour de ce qui vous intéresse.',
      es: '¿Tienes un destino concreto en mente? También podemos organizar una excursión privada de un día según tus intereses.',
    },
    fullDescription: {
      en: `Have somewhere specific in mind? We can also organize a private day trip around your own interests.

Tell us what you would like to see and we can help you create a comfortable itinerary from Fez. You can choose the places you are interested in, the departure time and how much time you would like to spend at each stop.

Our driver remains flexible throughout the day, so the experience does not feel like a fixed group excursion. If you prefer more independence, you can travel with the driver only. If you would like explanations and local insights during your visit, we can arrange a driver together with a local guide.

The idea is simple: a comfortable vehicle, a flexible schedule and a day designed around the way you want to discover Morocco.`,
      fr: `Vous avez une idée précise ? Nous pouvons aussi organiser une excursion privée autour de ce qui vous intéresse.

Dites-nous ce que vous souhaitez voir et nous vous aidons à composer un itinéraire confortable au départ de Fès. Vous choisissez les lieux, l’heure de départ et le temps à passer à chaque arrêt.

Le chauffeur reste flexible toute la journée, pour que l’expérience ne ressemble pas à une excursion de groupe figée. Si vous préférez plus d’indépendance, vous pouvez voyager avec le chauffeur seulement. Si vous voulez des explications et un regard local, nous pouvons prévoir un chauffeur avec un guide.

L’idée est simple : un véhicule confortable, un horaire souple et une journée conçue comme vous voulez découvrir le Maroc.`,
      es: `¿Tienes un destino concreto en mente? También podemos organizar una excursión privada de un día según tus intereses.

Cuéntanos qué te gustaría ver y te ayudaremos a preparar un itinerario cómodo desde Fez. Puedes elegir los lugares que te interesen, la hora de salida y cuánto tiempo quieres dedicar a cada parada.

Nuestro conductor mantiene la flexibilidad durante todo el día para que la experiencia no se parezca a una excursión de grupo con un programa fijo. Si prefieres más independencia, puedes viajar solo con el conductor. Si quieres explicaciones y una perspectiva local durante la visita, podemos organizar un conductor junto con un guía local.

La idea es sencilla: un vehículo cómodo, un horario flexible y un día diseñado según tu forma de descubrir Marruecos.`
    },
    highlights: {
      en: [
        'Private trip',
        'Flexible itinerary',
        'Comfortable vehicle',
        'Driver only, or driver plus a local guide',
        'Tell us what you would like to discover'
      ],
      fr: [
        'Excursion privée',
        'Itinéraire flexible',
        'Véhicule confortable',
        'Chauffeur seul, ou chauffeur et guide local',
        'Dites-nous ce que vous voulez découvrir'
      ],
      es: [
        'Excursión privada',
        'Itinerario flexible',
        'Vehículo cómodo',
        'Solo conductor o conductor con guía local',
        'Cuéntanos qué te gustaría descubrir'
      ]
    },
    practicalInfo: {
      duration: { en: 'Custom / Flexible', fr: 'Sur mesure / Flexible', es: 'A medida / Flexible' },
      departure: { en: 'Your Chosen Time & Location', fr: 'Heure et lieu de votre choix', es: 'Hora y lugar a tu elección' },
      groupSize: { en: 'Private (1 to 7 Passengers)', fr: 'Privé (1 à 7 personnes)', es: 'Privado (de 1 a 7 pasajeros)' },
      priceMAD: 1200,
      priceEUR: 110,
    },
    image: '/images/daytrip-custom/group-viewpoint.webp',
    imageAlt: {
      en: 'Travelers taking a photo above a mountain town in Morocco',
      fr: 'Voyageurs photographiés au-dessus d’une ville de montagne au Maroc',
      es: 'Viajeros haciéndose una foto sobre una ciudad de montaña en Marruecos',
    },
    actionType: 'book_tour',
    published: true,
  },
];

// 3. FOOD & TASTING EXPERIENCES
export const FOOD_TOURS_PILLARS: SectionPillar[] = [
  {
    id: 'food-tasting-walk',
    pageId: 'food-tours',
    title: {
      en: 'Taste Fez Through Local Eyes',
      fr: 'Goûter Fès à travers des yeux locaux',
      es: 'Saborea Fez con quienes viven en ella',
    },
    subtitle: {
      en: 'Taste Fez Through Local Eyes — Not a Sit-Down Dinner, but an Alley Safari',
      fr: 'Goûtez Fès à travers des yeux locaux au fil des ruelles',
      es: 'Saborea Fez con una mirada local: no es una cena en un restaurante, sino una ruta por sus callejuelas',
    },
    shortDescription: {
      en: 'Walk the old Medina and taste what local shops are preparing that day. This is not one large sit-down meal.',
      fr: 'Pour comprendre Fès, il faut la goûter ! Goûtez Harcha, Baghrir, Chebakia, Sfenj, Bissara, fromages locaux et thé à la menthe dans les adresses secrètes des Fassis.',
      es: 'Recorre la antigua medina y prueba lo que preparan las tiendas locales ese día. No se trata de sentarse a tomar una única comida abundante.',
    },
    fullDescription: {
      en: `Taste Fez Through Local Eyes. To understand Fez, you should not only walk through its streets. You should taste them.

Food in Fez is part of everyday life. It is found in small shops, bakeries, market stalls, traditional food places and family kitchens. It is the smell of bread coming from an oven, the sound of people ordering breakfast, the colours of spices in the market, a glass of Moroccan tea shared during a conversation, and small foods that people enjoy throughout the day.

Our food tasting walk takes you into this everyday side of the Medina. This is not simply a tour where you sit down for one large Moroccan meal. Instead, we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets and local products while learning how they are connected to life in Fez.

Depending on the day, season and availability, tastings can include: Harcha, Baghrir, Chebakia, local sweet and salty cheeses, Moroccan mint tea, walnuts, seasonal fresh juices, hot Sfenj doughnuts, rich Bissara bean soup, Zamgawiya, fried fish, liver prepared with chermoula, and Maakouda potato patties.

This is a private, flexible food experience just for you and your group. Come hungry — leave with a taste of Fez!`,
      fr: `Une aventure culinaire unique : marchez dans les ruelles animées et arrêtez-vous dans les échoppes traditionnelles pour savourer une dizaine de spécialités locales authentiques.`,
      es: `Saborea Fez con quienes viven en ella. Para entender Fez, no basta con recorrer sus calles: también hay que probar sus sabores.

La comida forma parte de la vida cotidiana de Fez. Está en las pequeñas tiendas, las panaderías, los puestos del mercado, los establecimientos tradicionales y las cocinas familiares. Es el olor del pan recién salido del horno, el sonido de quienes piden el desayuno, los colores de las especias, un vaso de té marroquí compartido durante una conversación y los pequeños bocados que se disfrutan a lo largo del día.

Nuestra ruta de degustación te acerca a esta faceta cotidiana de la medina. No es una visita en la que te sientas a tomar una gran comida marroquí. Recorremos la antigua medina y hacemos paradas para descubrir y probar platos, tentempiés, dulces y productos locales mientras aprendemos qué relación tienen con la vida en Fez.

Según el día, la estación y la disponibilidad, las degustaciones pueden incluir Harcha, Baghrir, Chebakia, quesos locales dulces y salados, té marroquí a la menta, nueces, zumos frescos de temporada, Sfenj calientes, una sabrosa sopa Bissara de habas, Zamgawiya, pescado frito, hígado con chermoula y tortitas de patata Maakouda.

Es una experiencia gastronómica privada y flexible, solo para ti y tu grupo. ¡Ven con hambre y llévate el sabor de Fez!`
    },
    highlights: {
      en: [
        'Taste 8–10+ authentic local street foods, snacks, and traditional pastries',
        'Sample warm Harcha, honeycomb Baghrir, Sfenj, and golden Maakouda',
        'Enjoy piping-hot Bissara fava soup with olive oil, cumin, and fresh bread',
        'Learn the art, hospitality, and ritual of traditional Moroccan mint tea',
        'Private walking pace with stops to interact with local bakers and cooks'
      ],
      fr: [
        'Dégustation de 8 à 10+ spécialités de rue, douceurs et mets traditionnels',
        'Dégustez Harcha tiède, Baghrir alvéolé, Sfenj doré et Maakouda',
        'Savourez la Bissara fumante à l’huile d’olive et au cumin',
        'Apprenez les secrets du rituel du thé à la menthe marocain',
        'Visite privée et pauses conviviales avec les commerçants locaux'
      ],
      es: [
        'Prueba entre 8 y 10 o más especialidades locales de comida callejera, tentempiés y dulces tradicionales',
        'Saborea Harcha caliente, Baghrir con sus pequeños agujeros, Sfenj y Maakouda doradas',
        'Disfruta de una Bissara de habas bien caliente con aceite de oliva, comino y pan fresco',
        'Conoce el arte, la hospitalidad y el ritual del té marroquí a la menta',
        'Paseo privado a vuestro ritmo, con paradas para conversar con panaderos y cocineros locales'
      ]
    },
    practicalInfo: {
      duration: { en: '3 to 3.5 Hours', fr: '3 à 3h30', es: 'De 3 a 3 horas y media' },
      departure: { en: 'Bab Boujloud or Bab Rcif', fr: 'Bab Boujloud ou Bab Rcif', es: 'Bab Boujloud o Bab Rcif' },
      groupSize: { en: 'Private (Tastings Included)', fr: 'Privé (Dégustations incluses)', es: 'Privado (degustaciones incluidas)' },
    },
    image: '/images/food-tasting-walk/street-sandwich.webp',
    kind: 'article',
    imageAlt: {
      en: 'Fresh Moroccan pastries and street food tastings in Fez',
      fr: 'Pâtisseries marocaines et dégustations culinaires à Fès',
      es: 'Dulces marroquíes recién hechos y degustaciones de comida callejera en Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'food-traditional-fassi',
    pageId: 'food-tours',
    title: {
      en: 'Discover Traditional Food of Fez',
      fr: 'Découvrir la Cuisine Traditionnelle Fassie',
      es: 'Descubre la cocina tradicional de Fez',
    },
    subtitle: {
      en: 'Pastilla, Tagines, Couscous & Royal Gastronomy',
      fr: 'Pastilla, tajines mijotés, couscous et gastronomie royale',
      es: 'Pastilla, tajines, cuscús y gastronomía real',
    },
    shortDescription: {
      en: 'Fez is considered the gastronomic capital of Morocco. Discover why Fassi cuisine is renowned for its refined balance of sweet and savoury, fragrant Ras el Hanout, and centuries of culinary art.',
      fr: 'Capitale gastronomique du Maroc, Fès marie subtilement le sucré et le salé avec sa célèbre Pastilla au pigeon, ses tajines aux pruneaux et ses mélanges d’épices.',
      es: 'Fez está considerada la capital gastronómica de Marruecos. Descubre por qué su cocina es famosa por el delicado equilibrio entre dulce y salado, el aromático Ras el Hanout y siglos de tradición culinaria.',
    },
    fullDescription: {
      en: `Fez has a particularly rich culinary heritage. Its food traditions have been influenced by the city's long history and by diverse cultures, including Arab-Andalusian, Jewish and Amazigh influences.

Fassi gastronomy is famous for its intricate balance of sweet and savoury flavours, slow-cooked tagines, and delicate pastries. The legendary Pastilla (pigeon or chicken layered in razor-thin warqa pastry with crushed almonds, cinnamon, and powdered sugar) was perfected here.

From slow-simmered lamb tagine with caramelized prunes and roasted almonds, to fragrant Couscous with seven vegetables and hearty Tfaya, you will understand why recipes passed down through generations of Fassi families are celebrated worldwide.`,
      fr: `Héritière d'un métissage arabo-andalou raffiné, la gastronomie fassie est célèbre pour ses plats emblématiques comme la Pastilla croustillante, le tajine mrouzia au miel et amandes, et le couscous traditionnel.`,
      es: `Fez posee un patrimonio culinario especialmente rico. Sus tradiciones gastronómicas reflejan la larga historia de la ciudad y las aportaciones de distintas culturas, entre ellas la árabe-andalusí, la judía y la amazigh.

La gastronomía de Fez es famosa por su delicado equilibrio entre sabores dulces y salados, sus tajines cocinados a fuego lento y sus finos dulces. Aquí se perfeccionó la legendaria Pastilla: capas de paloma o pollo envueltas en finísimas hojas de masa warqa con almendras trituradas, canela y azúcar glas.

Desde el tajín de cordero cocinado lentamente con ciruelas pasas caramelizadas y almendras tostadas hasta el aromático cuscús de siete verduras y la sabrosa Tfaya, descubrirás por qué las recetas transmitidas durante generaciones por las familias de Fez son apreciadas en todo el mundo.`
    },
    highlights: {
      en: [
        'Learn the story and assembly of the royal authentic Fassi Pastilla',
        'Discover slow-cooking techniques in traditional clay tagines (Tajine Mrouzia)',
        'Understand the 30+ spice composition of authentic Fassi Ras el Hanout',
        'Explore the seasonal calendar of Moroccan family meals and celebratory feasts',
        'Recommendations for genuine family-run riad dining and local home-cook tables'
      ],
      fr: [
        'Secrets de préparation de la véritable Pastilla fassie',
        'Techniques de cuisson lente dans les tajines de terre cuite',
        'Découverte des épices du mélange d’exception Ras el Hanout',
        'Calendrier des repas familiaux et traditions festives',
        'Bonnes adresses de tables d’hôtes et riads authentiques'
      ],
      es: [
        'Conoce la historia y la preparación de la auténtica Pastilla real de Fez',
        'Descubre las técnicas de cocción lenta en tajines tradicionales de barro, como el Tajine Mrouzia',
        'Conoce las más de 30 especias que componen el auténtico Ras el Hanout de Fez',
        'Explora el calendario estacional de comidas familiares y celebraciones marroquíes',
        'Recomendaciones de riads familiares y mesas locales con auténtica cocina casera'
      ]
    },
    practicalInfo: {
      duration: { en: 'Culinary Masterclass & Lunch', fr: 'Masterclass & Déjeuner', es: 'Clase de cocina y comida' },
      departure: { en: 'Medina Riad Kitchen', fr: 'Cuisine de Riad', es: 'Cocina de un riad de la medina' },
      groupSize: { en: 'Private Session (2 to 8 Guests)', fr: 'Session Privée (2 à 8 pers.)', es: 'Sesión privada (de 2 a 8 personas)' },
    },
    image: '/images/food-traditional-fassi/pastilla.webp',
    kind: 'article',
    imageAlt: {
      en: 'Traditional Moroccan tagine with almonds and prunes',
      fr: 'Tajine marocain traditionnel aux pruneaux et amandes',
      es: 'Tajín tradicional marroquí con almendras y ciruelas pasas',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'food-culture-life',
    pageId: 'food-tours',
    title: {
      en: 'Food Culture & Local Life in Fez',
      fr: 'Culture Culinaire & Vie Quotidienne à Fès',
      es: 'Cultura gastronómica y vida local en Fez',
    },
    subtitle: {
      en: 'Neighborhood Ferran Ovens, Communal Traditions & Tea Hospitality',
      fr: 'Fours de quartier traditionnels, rituels familiaux et hospitalité',
      es: 'Hornos Ferran de barrio, tradiciones compartidas y hospitalidad alrededor del té',
    },
    shortDescription: {
      en: 'Food in Fez is deeply social. Discover how neighborhood communal wood-fired ovens (Ferran) operate, how families bake their daily bread, and how Moroccan mint tea connects friends and strangers alike.',
      fr: 'La nourriture est au cœur du lien social à Fès. Découvrez le rôle central du four communal à bois (Ferran), les rituels du pain quotidien et l’art du thé à la menthe.',
      es: 'La comida en Fez tiene un profundo carácter social. Descubre cómo funcionan los hornos comunitarios de leña del barrio, llamados Ferran, cómo hornean las familias su pan diario y cómo el té marroquí a la menta reúne a amigos y desconocidos.',
    },
    fullDescription: {
      en: `Food Is Part of Everyday Life. In the Medina, food is not simply something you eat at a restaurant table; it is woven into the neighborhood architecture and social rituals.

One of the most fascinating aspects is the neighborhood Ferran (communal wood-fired oven). For centuries, families have prepared dough at home and sent children with wooden boards balancing bread loaves to the local baker, who marks each family's bread with a distinct signature slash before baking it on fragrant cedar or olive wood coals.

During our cultural food discovery, we step inside these active neighborhood ovens, visit traditional spice shops, understand the communal values of Moroccan dining, and experience genuine hospitality.`,
      fr: `Poussez les portes du Ferran de quartier, où le boulanger cuit au feu de bois les pains façonnés chaque matin par les familles de la médina. Un témoignage vivant de solidarité et de tradition.`,
      es: `La comida forma parte de la vida cotidiana. En la medina no es simplemente algo que se toma sentado en un restaurante: está integrada en la arquitectura del barrio y en sus costumbres sociales.

Uno de sus aspectos más fascinantes es el Ferran, el horno comunitario de leña del barrio. Durante siglos, las familias han preparado la masa en casa y han enviado a los niños con los panes sobre tablas de madera al panadero local. Este identifica el pan de cada familia con un corte propio antes de hornearlo sobre brasas aromáticas de cedro u olivo.

En nuestro recorrido por la cultura gastronómica entramos en estos hornos de barrio en funcionamiento, visitamos tiendas tradicionales de especias, conocemos el valor de compartir la mesa en Marruecos y vivimos su auténtica hospitalidad.`
    },
    highlights: {
      en: [
        'Visit a working communal neighborhood wood-fired bread oven (Ferran)',
        'Watch local bakers fire dozens of family breads with traditional wooden paddles',
        'Learn the etiquette and social symbolism of shared tajine eating',
        'Discover the seasonal rituals of Ramadan, Eid, and olive harvest season',
        'Savor fresh Moroccan tea prepared with fresh mountain herbs'
      ],
      fr: [
        'Visite d’un véritable four communal de quartier à bois (Ferran)',
        'Observation du travail des maîtres boulangers traditionnels',
        'Apprentissage des codes du partage autour du plat familial',
        'Rituels festifs et saisonniers (Ramadan, récolte des olives)',
        'Dégustation de thé parfumé aux herbes aromatiques de saison'
      ],
      es: [
        'Visita un horno comunitario de leña del barrio en funcionamiento (Ferran)',
        'Observa cómo los panaderos hornean decenas de panes familiares con palas tradicionales de madera',
        'Conoce las normas de cortesía y el significado social de compartir un tajín',
        'Descubre las tradiciones del Ramadán, el Eid y la temporada de recogida de aceitunas',
        'Saborea té marroquí recién preparado con hierbas frescas de montaña'
      ]
    },
    practicalInfo: {
      duration: { en: '2.5 Hours', fr: '2h30', es: '2 horas y media' },
      departure: { en: 'Bab Rcif Medina Entrance', fr: 'Entrée Bab Rcif', es: 'Entrada de la medina por Bab Rcif' },
      groupSize: { en: 'Small Private Group', fr: 'Petit groupe privé', es: 'Grupo privado reducido' },
    },
    image: '/images/food-culture-life/tea-tray.webp',
    kind: 'article',
    imageAlt: {
      en: 'Communal bread oven and daily food life in Fez',
      fr: 'Four à pain de quartier et vie quotidienne à Fès',
      es: 'Horno comunitario de pan y vida gastronómica cotidiana en Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'food-markets-souks',
    pageId: 'food-tours',
    title: {
      en: 'Local Markets & Souks of Fez',
      fr: 'Marchés Locaux & Souks Gourmands de Fès',
      es: 'Mercados locales y zocos de Fez',
    },
    subtitle: {
      en: 'Spices, Olives, Fresh Produce & Honey Markets of the Medina',
      fr: 'Épices, olives marinées, fruits frais et marché du miel',
      es: 'Mercados de especias, aceitunas, productos frescos y miel de la medina',
    },
    shortDescription: {
      en: 'The souks of Fez are the pantry of the city. Walk through Souk el-Attarine, taste marinated Atlas olives, discover rare Moroccan spices, pure mountain honey, and fresh culinary herbs.',
      fr: 'Parcourez les souks alimentaires animés : pyramides de curcuma et safran, olives marinées aux herbes, dattes du Sahara et miels de montagne.',
      es: 'Los zocos de Fez son la despensa de la ciudad. Recorre Souk el-Attarine, prueba aceitunas aliñadas del Atlas y descubre especias marroquíes poco comunes, miel pura de montaña y hierbas aromáticas frescas.'
    },
    fullDescription: {
      en: `The souks of Fez are not just tourist attractions; they are the living pantry where local families buy their fresh ingredients every morning.

Walk through Souk el-Attarine, famous since the Middle Ages for spices, incense, natural remedies, and perfumes. Taste cured olives in garlic, harissa, and wild thyme from huge wooden barrels. Discover fragrant saffron from Taliouine, pure argan oil, dried rosebuds, and wild mountain honeys (thyme, lavender, and eucalyptus).

Your local guide will help you understand local produce, compare quality, and interact respectfully with stallholders.`,
      fr: `Découvrez les étals vibrants du Souk el-Attarine, le marché aux olives de Bab Rcif et apprenez à reconnaître le véritable safran de Taliouine et l'huile d'argan pure.`,
      es: `Los zocos de Fez no son solo atractivos turísticos: son la despensa viva donde las familias locales compran ingredientes frescos cada mañana.

Recorre Souk el-Attarine, famoso desde la Edad Media por sus especias, incienso, remedios naturales y perfumes. Prueba aceitunas aliñadas con ajo, harissa y tomillo silvestre de grandes barriles de madera. Descubre el aromático azafrán de Taliouine, el aceite de argán puro, los capullos de rosa secos y las mieles de montaña de tomillo, lavanda y eucalipto.

Tu guía local te ayudará a conocer los productos de la zona, comparar su calidad y conversar con respeto con los vendedores.`
    },
    highlights: {
      en: [
        'Explore Souk el-Attarine: centuries-old market of rare spices and natural botanicals',
        'Taste several varieties of marinated Moroccan olives directly from the vendors',
        'Learn how to identify genuine Taliouine saffron and culinary argan oil',
        'Discover local honey tastings (mountain thyme, orange blossom, eucalyptus)',
        'Engage directly with friendly market shopkeepers with your guide translating'
      ],
      fr: [
        'Exploration du Souk el-Attarine et ses pyramides d’épices parfumées',
        'Dégustation d’olives marinées locales aux herbes sauvages',
        'Conseils d’experts pour choisir le vrai safran et l’huile d’argan pure',
        'Dégustation de miels rares de thym de montagne et fleur d’oranger',
        'Échanges chaleureux avec les marchands locaux'
      ],
      es: [
        'Explora Souk el-Attarine, un mercado centenario de especias poco comunes y productos botánicos naturales',
        'Prueba distintas variedades de aceitunas marroquíes aliñadas directamente de los vendedores',
        'Aprende a reconocer el auténtico azafrán de Taliouine y el aceite de argán culinario',
        'Descubre degustaciones de mieles locales de tomillo de montaña, azahar y eucalipto',
        'Conversa con los amables comerciantes del mercado con la ayuda de tu guía como intérprete'
      ]
    },
    practicalInfo: {
      duration: { en: '2.5 to 3 Hours', fr: '2h30 à 3h', es: 'De 2 horas y media a 3 horas' },
      departure: { en: 'Bab Boujloud Gate', fr: 'Porte Bab Boujloud', es: 'Puerta Bab Boujloud' },
      groupSize: { en: 'Private Market Walk', fr: 'Balade Privée au Marché', es: 'Paseo privado por el mercado' },
    },
    image: '/images/food-markets-souks/spice-tins.webp',
    kind: 'article',
    imageAlt: {
      en: 'Vibrant spice souk and colorful produce in Fez',
      fr: 'Souk des épices coloré et produits frais à Fès',
      es: 'Animado zoco de especias y productos de vivos colores en Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'our-food-tours',
    pageId: 'food-tours',
    kind: 'product',
    title: {
      en: 'Private Food Tasting Walk',
      fr: 'Balade privée de dégustation',
      es: 'Ruta privada de degustación a pie',
    },
    subtitle: {
      en: 'Taste Fez through local eyes',
      fr: 'Goûter Fès à travers des yeux locaux',
      es: 'Saborea Fez con quienes viven en ella',
    },
    shortDescription: {
      en: 'A private walk through the old Medina, with tastings of what local shops are preparing that day.',
      fr: 'Une balade privée dans la vieille médina, avec les dégustations de ce que les boutiques préparent ce jour-là.',
      es: 'Un paseo privado por la antigua medina, con degustaciones de lo que preparan las tiendas locales ese día.',
    },
    fullDescription: {
      en: `To understand Fez, you should not only walk through its streets. You should taste them.

Our food tasting walk takes you into the everyday side of the Medina. This is not a tour where you sit down for one large Moroccan meal. We walk through the old Medina and stop along the way to taste foods, snacks, sweets and local products, and to learn how they are connected to life in Fez.

The exact selection is not fixed. Food is seasonal, and local shops do not always prepare the same things every day. That is part of the experience.

This is a private walk for you and your group. We can take our time, stop for photographs, talk with local sellers and stay longer where you are interested. There is no need to rush from one tasting to another.`,
      fr: `Pour comprendre Fès, il ne suffit pas d’en parcourir les rues. Il faut la goûter.

La balade vous emmène dans le quotidien de la médina. Ce n’est pas une visite où l’on s’assoit pour un grand repas. On marche dans la vieille médina et l’on s’arrête pour goûter des en-cas, des douceurs et des produits locaux, et pour comprendre leur place dans la vie de Fès.

La sélection n’est pas fixe. La cuisine est de saison, et les boutiques ne préparent pas toujours la même chose. C’est une partie de l’expérience.

La balade est privée, pour vous et votre groupe. On peut prendre le temps, photographier, parler avec les vendeurs et rester plus longtemps là où cela vous intéresse.`,
      es: `Para entender Fez, no basta con recorrer sus calles: también hay que probar sus sabores.

Nuestra ruta de degustación te acerca a la vida cotidiana de la medina. No es una visita en la que te sientas a tomar una gran comida marroquí. Recorremos la antigua medina y hacemos paradas para probar platos, tentempiés, dulces y productos locales, y conocer qué relación tienen con la vida en Fez.

La selección concreta no es fija. La comida depende de la temporada y las tiendas locales no siempre preparan lo mismo cada día. Eso forma parte de la experiencia.

Es un paseo privado para ti y tu grupo. Podemos ir con calma, parar a hacer fotografías, conversar con los vendedores y quedarnos más tiempo donde os interese. No hace falta ir con prisas de una degustación a otra.`
    },
    highlights: {
      en: [
        'Private walk for your group',
        'Tastings depend on the day, the season and what local shops are preparing',
        'Sweet and savoury foods, tea and everyday specialities',
        'Time to ask, photograph and talk with sellers',
        'No rush from one tasting to another'
      ],
      fr: [
        'Balade privée pour votre groupe',
        'Les dégustations dépendent du jour, de la saison et des boutiques',
        'Sucré, salé, thé et spécialités du quotidien',
        'Le temps de poser des questions, photographier et parler avec les vendeurs',
        'Pas de course d’une dégustation à l’autre'
      ],
      es: [
        'Paseo privado para vuestro grupo',
        'Las degustaciones dependen del día, la temporada y lo que preparen las tiendas locales',
        'Sabores dulces y salados, té y especialidades del día a día',
        'Tiempo para preguntar, hacer fotografías y conversar con los vendedores',
        'Sin prisas de una degustación a otra'
      ]
    },
    practicalInfo: {
      duration: { en: '3 to 3.5 Hours', fr: '3 à 3h30', es: 'De 3 a 3 horas y media' },
      departure: { en: 'Bab Boujloud or Bab Rcif', fr: 'Bab Boujloud ou Bab Rcif', es: 'Bab Boujloud o Bab Rcif' },
      groupSize: { en: 'Private (Tastings Included)', fr: 'Privé (dégustations incluses)', es: 'Privado (degustaciones incluidas)' },
      priceMAD: 550,
      priceEUR: 50,
    },
    image: '/images/food-tasting-walk/medina-lane.webp',
    imageAlt: {
      en: 'A covered lane in the Fez Medina',
      fr: 'Une ruelle couverte de la médina de Fès',
      es: 'Una callejuela cubierta de la medina de Fez',
    },
    actionType: 'book_tour',
    published: true,
  },
];

// 4. TRAVEL TIPS & LOCAL ADVICE
export const TRAVEL_TIPS_PILLARS: SectionPillar[] = [
  {
    id: 'tips-plan-trip',
    pageId: 'travel-tips',
    title: {
      en: 'Planning Your Visit to Fez',
      fr: 'Planifier Votre Séjour à Fès',
      es: 'Planifica tu visita a Fez',
    },
    subtitle: {
      en: 'Best Seasons, Ideal Duration, Neighborhoods & Weather',
      fr: 'Meilleures saisons, durée idéale, météo et quartiers',
      es: 'Mejores épocas, duración ideal, barrios y clima',
    },
    shortDescription: {
      en: 'Make the most of your journey to Fez. Learn why spring and autumn are the ideal travel months, how many days you need (2 to 4 days), and where to stay between authentic Riads and modern hotels.',
      fr: 'Conseils pour réussir votre voyage : printemps et automne privilégiés, durée idéale de 2 à 4 jours, et choix entre Riad traditionnel et hôtel moderne.',
      es: 'Aprovecha al máximo tu viaje a Fez. Descubre por qué la primavera y el otoño son las mejores épocas, cuántos días necesitas (de 2 a 4) y dónde alojarte, entre riads tradicionales y hoteles modernos.',
    },
    fullDescription: {
      en: `Planning Your Visit to Fez. A few simple preparations can make your stay in Fez much more enjoyable and relaxing.

When to Visit: Spring (March to May) and Autumn (September to November) offer comfortable daytime temperatures and pleasant evenings, making them the most comfortable months for walking through the Medina. Summer can be quite warm, while winter brings cooler days and chilly evenings.

How Long to Stay: Two to three days allows you to discover the main areas of the Old Medina, visit key historic landmarks, enjoy a food tasting experience, and take in panoramic viewpoints. If you plan to add day trips to Chefchaouen or Volubilis, four to five days is ideal.

Where to Stay: Staying inside a traditional Riad in Fes el-Bali offers an authentic historical atmosphere with interior courtyards and tiled fountains. Alternatively, the Ville Nouvelle offers modern hotels with car access right to the door.`,
      fr: `Privilégiez le printemps et l'automne pour une météo clémente. Prévoyez 3 jours pour la médina et 1 à 2 jours supplémentaires pour les excursions vers Chefchaouen et Volubilis.`,
      es: `Planifica tu visita a Fez. Unos preparativos sencillos pueden hacer que tu estancia sea mucho más agradable y relajada.

Cuándo viajar: la primavera (de marzo a mayo) y el otoño (de septiembre a noviembre) ofrecen temperaturas agradables durante el día y noches suaves. Son las épocas más cómodas para recorrer la medina a pie. El verano puede ser bastante caluroso y el invierno trae días más frescos y noches frías.

Cuánto tiempo quedarse: dos o tres días permiten descubrir las principales zonas de la antigua medina, visitar los monumentos históricos más importantes, disfrutar de una experiencia de degustación y contemplar las vistas desde los miradores. Si quieres añadir excursiones a Chefchaouen o Volubilis, lo ideal son cuatro o cinco días.

Dónde alojarse: un riad tradicional en Fes el-Bali ofrece un ambiente histórico auténtico, con patios interiores y fuentes revestidas de azulejos. Como alternativa, la Ville Nouvelle cuenta con hoteles modernos a los que se puede llegar en coche hasta la puerta.`
    },
    highlights: {
      en: [
        'Best travel seasons: pleasant spring (Mar–May) and golden autumn (Sep–Nov)',
        'Recommended stay: 2–3 days for the Medina, 4–5 days including day trips',
        'Riad vs Hotel: historic pedestrian riad charm vs modern street-level access',
        'What to pack: lightweight layers, sun protection, and sturdy walking shoes',
        'Direct airport access: Fez-Saïss Airport (FEZ) located just 25 minutes away'
      ],
      fr: [
        'Saisons idéales : printemps agréable (mars–mai) et automne doux (sept–nov)',
        'Durée conseillée : 2 à 3 jours pour la ville, 4 à 5 jours avec excursions',
        'Riad ou Hôtel : charme médiéval piéton ou confort moderne accessible en voiture',
        'Dans la valise : vêtements légers et pudiques, chaussures confortables',
        'Accès aéroport : Aéroport Fès-Saïss (FEZ) situé à seulement 25 min'
      ],
      es: [
        'Mejores épocas: primavera agradable (marzo–mayo) y otoño suave (septiembre–noviembre)',
        'Estancia recomendada: 2–3 días para la medina y 4–5 días si incluyes excursiones',
        'Riad u hotel: encanto histórico en zona peatonal o alojamiento moderno con acceso en coche',
        'Qué llevar: ropa ligera por capas, protección solar y calzado resistente para caminar',
        'Acceso al aeropuerto: Fez-Saïss (FEZ), a tan solo 25 minutos'
      ]
    },
    practicalInfo: {
      duration: { en: 'Travel Guide', fr: 'Guide Pratique', es: 'Guía de viaje' },
      departure: { en: 'Fez Destination Guide', fr: 'Guide Destination Fès', es: 'Guía de Fez como destino' },
      groupSize: { en: 'Free Local Knowledge', fr: 'Conseils Gratuits', es: 'Información local gratuita' },
    },
    image: '/images/tips-plan-trip/medina-view.webp',
    kind: 'article',
    imageAlt: {
      en: 'Panoramic view over the rooftops of Fez during sunset',
      fr: 'Vue panoramique sur les toits de Fès au coucher du soleil',
      es: 'Vista panorámica de los tejados de Fez al atardecer',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'tips-getting-around',
    pageId: 'travel-tips',
    title: {
      en: 'Getting Around Fez',
      fr: 'Se Déplacer à Fès : Rues, Portes & Taxis',
      es: 'Cómo moverse por Fez',
    },
    subtitle: {
      en: 'Pedestrian Medina, Historic Gates, Red Petit Taxis & City Access',
      fr: 'Médina piétonne, portes principales, petits taxis rouges et trajets',
      es: 'Medina peatonal, puertas históricas, pequeños taxis rojos y accesos a la ciudad',
    },
    shortDescription: {
      en: 'Getting around Fez is unique. The Old Medina is completely pedestrian with narrow lanes. Outside the walls, red Petit Taxis are easy and cheap (10–20 MAD). Learn how to navigate with ease.',
      fr: 'La Médina est 100% piétonne. À l’extérieur des remparts, les petits taxis rouges sont très pratiques et économiques (10 à 20 MAD la course en ville).',
      es: 'Moverse por Fez es una experiencia singular. La antigua medina es completamente peatonal y tiene callejuelas estrechas. Fuera de las murallas, los pequeños taxis rojos son prácticos y económicos (10–20 MAD). Aprende a orientarte con facilidad.',
    },
    fullDescription: {
      en: `Getting around Fez is different from moving around a modern city. The Old Medina was built around walking, with narrow streets, small passages and pedestrian areas. Outside the Medina, taxis and cars are much more practical.

Key Medina Gates: Because cars cannot enter the Old Medina, taxis drop passengers at major gates where pedestrian streets begin. The most practical access points include:
* Bab Boujloud (The iconic Blue Gate)
* Bab Rcif (Central access to lower medina)
* Bab Mahrouk, Bab Ziat & Ain Azliten
* Place Batha (near museums and riads)

Red Petit Taxis: Outside the pedestrian walls, the red petit taxi is the easiest way to move. A ride from the Medina towards the New City usually costs around 10–20 MAD. Taxis take up to 3 passengers. Always ensure the driver switches on the meter (compteur).

Exploring with a Guide: A local guide eliminates the anxiety of getting lost in 9,000 alleys and lets you focus on enjoying the beauty, stories, and crafts.`,
      fr: `À l'intérieur de la médina, tout se fait à pied. Aux abords des remparts (Bab Boujloud, Bab Rcif, Batha), empruntez les petits taxis rouges pour rejoindre la Ville Nouvelle pour 10 à 20 dirhams.`,
      es: `Moverse por Fez es distinto de desplazarse por una ciudad moderna. La antigua medina está pensada para caminar, con calles estrechas, pequeños pasajes y zonas peatonales. Fuera de la medina, los taxis y los coches resultan mucho más prácticos.

Principales puertas de la medina: como los coches no pueden entrar en la antigua medina, los taxis dejan a los pasajeros junto a las puertas principales, donde empiezan las calles peatonales. Los accesos más prácticos son:
* Bab Boujloud (la emblemática puerta azul)
* Bab Rcif (acceso central a la parte baja de la medina)
* Bab Mahrouk, Bab Ziat y Ain Azliten
* Place Batha (cerca de museos y riads)

Pequeños taxis rojos: fuera de las murallas de la zona peatonal, el pequeño taxi rojo es la forma más sencilla de desplazarse. Un trayecto de la medina a la ciudad nueva suele costar unos 10–20 MAD. Admiten hasta 3 pasajeros. Comprueba siempre que el conductor active el taxímetro.

Recorrer la ciudad con un guía: un guía local evita la preocupación de perderse entre 9.000 callejuelas y te permite concentrarte en disfrutar de la belleza, las historias y la artesanía.`
    },
    highlights: {
      en: [
        'Pedestrian heart: Fes el-Bali is the world’s largest car-free urban zone',
        'Main vehicle pickup gates: Bab Boujloud, Bab Rcif, Ain Azliten, and Batha',
        'Red Petit Taxis: carry up to 3 passengers, typical city fare is 10–20 MAD',
        'Grand Taxis & Private Vans: used for regional trips, airport transfers, and day tours',
        'Why use a local guide: effortless navigation without checking maps every two minutes'
      ],
      fr: [
        'Cité piétonne : Fès el-Bali est la plus grande zone urbaine sans voiture au monde',
        'Portes d’accès clés : Bab Boujloud, Bab Rcif, Aïn Azliten et place Batha',
        'Petits taxis rouges : jusqu’à 3 passagers, tarif moyen de 10 à 20 MAD',
        'Grands taxis et vans privés : idéals pour l’aéroport et les excursions',
        'Confort d’un guide local : sérénité totale sans risque de se perdre'
      ],
      es: [
        'Centro peatonal: Fes el-Bali es la mayor zona urbana sin coches del mundo',
        'Principales puntos de recogida: Bab Boujloud, Bab Rcif, Ain Azliten y Batha',
        'Pequeños taxis rojos: hasta 3 pasajeros, con una tarifa urbana habitual de 10–20 MAD',
        'Grandes taxis y vehículos privados: para trayectos regionales, traslados al aeropuerto y excursiones',
        'Ventaja de un guía local: orientarte con facilidad sin consultar el mapa cada dos minutos'
      ]
    },
    practicalInfo: {
      duration: { en: 'Transit Guide', fr: 'Guide Transports', es: 'Guía de transporte' },
      departure: { en: 'Medina Gates & City', fr: 'Portes & Ville', es: 'Puertas de la medina y ciudad' },
      groupSize: { en: 'Practical Local Advice', fr: 'Conseils Utiles', es: 'Consejos prácticos locales' },
    },
    image: '/images/tips-getting-around/medina-walker.webp',
    kind: 'article',
    imageAlt: {
      en: 'Red Petit Taxis outside the historic gates of Fez',
      fr: 'Petits taxis rouges devant les portes historiques de Fès',
      es: 'Pequeños taxis rojos junto a las puertas históricas de Fez',
    },
    actionType: 'explore',
    published: true,
  },
  {
    id: 'tips-practical',
    pageId: 'travel-tips',
    title: {
      en: 'Practical Tips for Visitors',
      fr: 'Conseils Pratiques pour Votre Séjour',
      es: 'Consejos prácticos para visitantes',
    },
    subtitle: {
      en: 'Cash, Shoes, Modesty, Safety, Friday Rhythm & Photography',
      fr: 'Espèces, chaussures, tenue vestimentaire, rythme du vendredi et photos',
      es: 'Efectivo, calzado, vestimenta, seguridad, ritmo del viernes y fotografías',
    },
    shortDescription: {
      en: 'A few simple things make your stay in Fez comfortable and stress-free. Carry local cash (MAD), wear comfortable walking shoes, dress respectfully, respect the Friday rhythm, and enjoy local tea breaks.',
      fr: 'Quelques réflexes simples garantissent un séjour serein : prévoir des espèces (MAD), des chaussures confortables, une tenue respectueuse et profiter des pauses thé.',
      es: 'Unos consejos sencillos harán que tu estancia en Fez sea cómoda y sin preocupaciones. Lleva efectivo en moneda local (MAD), usa calzado cómodo, viste con respeto, ten en cuenta el ritmo del viernes y disfruta de las pausas para tomar té.',
    },
    fullDescription: {
      en: `A few simple things can make your stay in Fez much easier and more comfortable. Fez is a historic city with its own rhythm and customs. Knowing a few practical details can help you feel at home:

Carry Some Cash: While hotels and upscale riads accept credit cards, cash in Moroccan Dirhams (MAD) is essential for small shops, local food stalls, tips, and taxis. Keep small coins and bills with you.

Wear Comfortable Shoes: You will walk more than expected in the Medina. The stone streets can be uneven with slopes and steps. Good walking shoes make a world of difference.

Dress Respectfully: Fez is a traditional cultural center. Modest clothing covering shoulders and knees is appreciated, particularly when passing near religious sites and traditional neighborhoods.

Friday Has a Different Rhythm: Friday is the holy day in Morocco. Many traditional shops close or operate on a slower schedule between 12:00 PM and 3:30 PM for Friday communal prayers. Plan museum and market visits accordingly.

Photography Etiquette: Always ask with a warm smile before taking close-up photos of craftsmen or shopkeepers. A little courtesy goes a very long way!`,
      fr: `Gardez toujours des dirhams liquides sur vous, portez de bonnes chaussures de marche, prévoyez des vêtements couvrant épaules et genoux, et demandez poliment avant de photographier les habitants.`,
      es: `Unas precauciones sencillas pueden hacer que tu estancia en Fez sea mucho más fácil y cómoda. Es una ciudad histórica con su propio ritmo y sus costumbres. Conocer algunos detalles prácticos te ayudará a sentirte como en casa:

Lleva algo de efectivo: aunque los hoteles y los riads de categoría aceptan tarjetas, el efectivo en dírhams marroquíes (MAD) es imprescindible en pequeñas tiendas, puestos de comida, taxis y para las propinas. Lleva monedas y billetes pequeños.

Usa calzado cómodo: en la medina caminarás más de lo que imaginas. Las calles de piedra pueden ser irregulares y tener cuestas y escalones. Un buen calzado para caminar marca la diferencia.

Viste con respeto: Fez es un centro cultural tradicional. Se agradece la ropa discreta que cubra hombros y rodillas, sobre todo cerca de lugares religiosos y en barrios tradicionales.

El viernes tiene otro ritmo: es el día sagrado en Marruecos. Muchas tiendas tradicionales cierran o reducen su actividad entre las 12:00 y las 15:30 por la oración comunitaria del viernes. Tenlo en cuenta al planificar visitas a museos y mercados.

Cortesía al hacer fotografías: pide siempre permiso con una sonrisa antes de fotografiar de cerca a artesanos o comerciantes. ¡Un pequeño gesto de cortesía ayuda mucho!`
    },
    highlights: {
      en: [
        'Always carry cash (Moroccan Dirham): vital for Medina snacks, taxis, and craft souks',
        'Wear supportive walking shoes for medieval stone alleys, stairs, and cobblestones',
        'Dress comfortably and respectfully: light layers covering shoulders and knees',
        'Friday prayer schedule: souks and artisan stalls pause between 12:00 and 15:30',
        'Polite photography: ask permission before photographing local artisans and residents',
        'Local SIM cards: readily available at the airport and city kiosks for easy data'
      ],
      fr: [
        'Prévoyez toujours des espèces en dirhams pour les achats de rue et les taxis',
        'Portez d’excellentes chaussures de marche adaptées aux pavés et ruelles en pente',
        'Privilégiez des vêtements confortables et respectueux des traditions locales',
        'Rythme du vendredi : fermeture de certains commerces entre 12h et 15h30',
        'Respect en photo : demandez toujours l’accord avant de photographier quelqu’un',
        'Carte SIM locale : facile à obtenir à l’arrivée pour rester connecté'
      ],
      es: [
        'Lleva siempre efectivo en dírhams marroquíes para los tentempiés, taxis y zocos de artesanía',
        'Usa calzado que sujete bien el pie para las callejuelas medievales, escaleras y adoquines',
        'Viste con comodidad y respeto: prendas ligeras por capas que cubran hombros y rodillas',
        'Oración del viernes: los zocos y puestos artesanales hacen una pausa entre las 12:00 y las 15:30',
        'Fotografías con respeto: pide permiso antes de fotografiar a artesanos y residentes',
        'Tarjetas SIM locales: disponibles en el aeropuerto y en quioscos de la ciudad para conectarte fácilmente'
      ]
    },
    practicalInfo: {
      duration: { en: 'Local Advice', fr: 'Conseils Pratiques', es: 'Consejos locales' },
      departure: { en: 'Essential Preparation', fr: 'Préparation Voyage', es: 'Preparativos esenciales' },
      groupSize: { en: 'Visitor Etiquette', fr: 'Savoir-vivre Local', es: 'Normas de cortesía para visitantes' },
    },
    image: '/images/tips-practical/medina-steps.webp',
    kind: 'article',
    imageAlt: {
      en: 'Traditional Moroccan tea, crafts, and relaxed Medina moments',
      fr: 'Moment de détente autour d’un thé marocain dans la médina',
      es: 'Té tradicional marroquí, artesanía y momentos tranquilos en la medina',
    },
    actionType: 'explore',
    published: true,
  },
];

// 5. ABOUT US & OUR REAL TEAM
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'med-founder',
    name: 'Med',
    role: {
      en: 'Founder & Local Host',
      fr: 'Fondateur & Hôte Local',
      es: 'Fundador y anfitrión local',
    },
    bio: {
      en: 'Based in Fez, Med created Fez Guide Tours to share his home city with world travellers in a simple, comfortable and personal way. He coordinates closely with guests, native guides, and trusted partners to curate unforgettable experiences.',
      fr: 'Basé à Fès, Med a créé Fez Guide Tours pour partager sa ville natale avec les voyageurs de manière simple, chaleureuse et sur mesure. Il coordonne chaque visite avec soin.',
      es: 'Med vive en Fez y creó Fez Guide Tours para compartir su ciudad natal con viajeros de todo el mundo de una forma sencilla, cómoda y personal. Coordina cada detalle con los visitantes, los guías locales y los colaboradores de confianza para preparar experiencias inolvidables.',
    },
    languages: ['Arabic', 'English', 'French'],
    experience: { en: 'Native Fassi Host', fr: 'Hôte Natif de Fès', es: 'Anfitrión nacido en Fez' },
    avatarUrl: '/src/assets/images/real/about_us_image1.jpg',
  },
  {
    id: 'team-guides',
    name: 'Our Local Guides',
    role: {
      en: 'Knowledgeable Native Guides',
      fr: 'Guides Locaux Passionnés',
      es: 'Guías locales con un profundo conocimiento de Fez',
    },
    bio: {
      en: 'We work with licensed local guides who truly know Fez, its history, architecture, Medina, and living culture. They share their deep knowledge, answer all your questions, and help you discover the city through local eyes.',
      fr: 'Nous travaillons avec des guides locaux expérimentés qui maîtrisent l’histoire, les trésors architecturaux et les ruelles secrètes de Fès pour vous offrir une visite passionnante.',
      es: 'Trabajamos con guías locales acreditados que conocen a fondo Fez, su historia, su arquitectura, la medina y su cultura viva. Comparten sus conocimientos, responden a tus preguntas y te ayudan a descubrir la ciudad con una mirada local.',
    },
    languages: ['English', 'French', 'Spanish', 'Arabic'],
    experience: { en: '10+ Years in Medina', fr: '10+ ans d’expérience', es: 'Más de 10 años de experiencia en la medina' },
    avatarUrl: '/src/assets/images/real/about_us_image2.jpg',
  },
  {
    id: 'team-drivers',
    name: 'Our Drivers & Partners',
    role: {
      en: 'Trusted Drivers & Regional Hosts',
      fr: 'Chauffeurs de Confiance & Partenaires',
      es: 'Conductores de confianza y anfitriones de la región',
    },
    bio: {
      en: 'For scenic day trips, airport transfers, and excursions across northern Morocco, we work with professional, trusted local drivers with comfortable, modern air-conditioned vehicles to ensure your journey is safe, relaxing, and on schedule.',
      fr: 'Pour vos excursions vers Chefchaouen, Meknès ou l’Atlas, nos chauffeurs professionnels vous garantissent confort, sécurité et ponctualité à bord de véhicules récents.',
      es: 'Para las excursiones de un día, los traslados al aeropuerto y los recorridos por el norte de Marruecos, trabajamos con conductores locales profesionales y de confianza. Sus vehículos modernos, cómodos y con aire acondicionado permiten viajar con seguridad, tranquilidad y puntualidad.',
    },
    languages: ['Arabic', 'French', 'English'],
    experience: { en: 'Professional Fleet', fr: 'Flotte Confortable', es: 'Flota profesional' },
    avatarUrl: '/src/assets/images/real/about_us_image5.jpg',
  },
];

export const ABOUT_STORY = {
  title: {
    en: 'About Us & Our Team',
    fr: 'À Propos de Nous & Notre Équipe',
    es: 'Quiénes somos y nuestro equipo',
  },
  subtitle: {
    en: 'A small local team based in Fez dedicated to sharing our city in a simple, comfortable and personal way.',
    fr: 'Une équipe locale basée à Fès dédiée à vous faire découvrir notre ville avec simplicité et confort.',
    es: 'Un pequeño equipo local con sede en Fez, dedicado a compartir nuestra ciudad de una forma sencilla, cómoda y a tu medida.',
  },
  storyParagraph1: {
    en: 'We are a small local team based in Fez. We created Fez Guide Tours to share our city with travellers and help them discover Fez in a simple, comfortable and personal way. We know the streets of the Medina, the different areas of the city, the local food, traditions and everyday life. Our goal is simple: to help you enjoy Fez and discover the city through local eyes.',
    fr: 'Nous sommes une petite équipe locale basée à Fès. Nous avons créé Fez Guide Tours pour partager notre passion et aider les voyageurs à découvrir la ville en toute simplicité, confort et authenticité. Notre objectif est clair : vous faire vivre Fès à travers des yeux locaux.',
    es: 'Somos un pequeño equipo local con sede en Fez. Creamos Fez Guide Tours para compartir nuestra ciudad con los viajeros y ayudarles a descubrirla de una forma sencilla, cómoda y personal. Conocemos las callejuelas de la medina, los distintos barrios, la gastronomía local, las tradiciones y la vida cotidiana. Nuestro objetivo es sencillo: ayudarte a disfrutar de Fez y descubrir la ciudad con quienes viven en ella.',
  },
  storyParagraph2: {
    en: 'Why We Do It: We believe that the best way to discover Fez is not only by visiting its famous places, but also by seeing how the city really lives. We want to welcome you to our city, share what we know and help you create good memories in Fez. Welcome to Fez. See the city through local eyes.',
    fr: 'Pourquoi nous le faisons : Nous croyons que la meilleure façon de découvrir Fès n’est pas seulement de visiter ses monuments célèbres, mais de comprendre comment la ville vit réellement. Nous voulons vous accueillir chaleureusement et créer des souvenirs inoubliables.',
    es: 'Por qué lo hacemos: creemos que la mejor forma de descubrir Fez no consiste solo en visitar sus lugares más famosos, sino también en conocer cómo vive realmente la ciudad. Queremos darte la bienvenida, compartir lo que sabemos y ayudarte a crear buenos recuerdos en Fez. Bienvenido a Fez. Descubre la ciudad con quienes viven en ella.',
  },
  pillars: [
    {
      title: { en: 'Born & Based in Fez', fr: 'Nés & Basés à Fès', es: 'Nacidos en Fez y residentes en la ciudad' },
      desc: {
        en: 'We live here, understand every corner, and navigate the Medina with natural ease.',
        fr: 'Nous vivons ici et connaissons chaque recoin de la médina depuis notre enfance.',
        es: 'Vivimos aquí, conocemos cada rincón y nos movemos por la medina con total naturalidad.',
      },
    },
    {
      title: { en: 'Private & Personal', fr: 'Visites Privées & Sur Mesure', es: 'Visitas privadas y a medida' },
      desc: {
        en: 'Dedicated experiences for you and your group, moving at your pace with no rushed crowds.',
        fr: 'Des expériences exclusives adaptées à votre rythme, sans la contrainte des grands groupes.',
        es: 'Experiencias pensadas para ti y tu grupo, a vuestro ritmo y sin las prisas de los grandes grupos.',
      },
    },
    {
      title: { en: 'Comfort & Trust', fr: 'Confort & Confiance', es: 'Comodidad y confianza' },
      desc: {
        en: 'Clear communication, comfortable vehicles, and honest local guidance every step of the way.',
        fr: 'Communication fluide, véhicules climatisés confortables et conseils bienveillants.',
        es: 'Comunicación clara, vehículos cómodos y orientación local sincera en cada paso del viaje.',
      },
    },
  ],
};

// 6. FREQUENTLY ASKED QUESTIONS (FAQ)
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'tours',
    question: {
      en: 'What types of experiences do you offer in Fez?',
      fr: 'Quels types d’expériences proposez-vous à Fès ?',
      es: '¿Qué tipos de experiencias ofrecéis en Fez?',
    },
    answer: {
      en: 'We offer private tours and local experiences in Fez, including Medina walking tours, food and tasting experiences, cultural visits, and customized itineraries. We also organize private day trips from Fez to destinations such as Chefchaouen, Meknes, Volubilis, Moulay Idriss and Ifrane in the Middle Atlas.',
      fr: 'Nous proposons des visites privées de la médina, des balades dégustations de street food, des découvertes culturelles et des excursions privées vers Chefchaouen, Meknès, Volubilis et Ifrane.',
      es: 'Ofrecemos visitas privadas y experiencias locales en Fez: recorridos a pie por la medina, rutas gastronómicas y degustaciones, visitas culturales e itinerarios a medida. También organizamos excursiones privadas de un día desde Fez a destinos como Chefchaouen, Meknes, Volubilis, Moulay Idriss e Ifrane, en el Atlas Medio.',
    },
  },
  {
    id: 'faq-2',
    category: 'tours',
    question: {
      en: 'Are your tours private?',
      fr: 'Vos visites sont-elles privées ?',
      es: '¿Vuestras visitas son privadas?',
    },
    answer: {
      en: 'Most of our experiences are arranged privately, meaning the experience is exclusively for you and your travelling group rather than a large group of strangers. This allows you to ask questions, take your time, and enjoy a much more personal pace.',
      fr: 'La quasi-totalité de nos expériences sont organisées en privé, exclusivement pour vous et vos compagnons de voyage, afin de garantir un rythme détendu et personnalisé.',
      es: 'La mayoría de nuestras experiencias se organizan de forma privada, exclusivamente para ti y tus compañeros de viaje, en lugar de un gran grupo de desconocidos. Así podéis hacer preguntas, tomaros vuestro tiempo y disfrutar de un ritmo mucho más personal.',
    },
  },
  {
    id: 'faq-3',
    category: 'tours',
    question: {
      en: 'Can I customize my tour?',
      fr: 'Puis-je personnaliser mon itinéraire ?',
      es: '¿Puedo personalizar mi visita?',
    },
    answer: {
      en: 'Yes. If you have specific places you want to visit, particular dietary preferences, or limited time, simply tell us before or upon booking. We will gladly adapt the route or schedule where possible.',
      fr: 'Absolument. Si vous avez des centres d’intérêt spécifiques ou des contraintes de temps, faites-le nous savoir et nous adapterons le parcours avec plaisir.',
      es: 'Sí. Si quieres visitar lugares concretos, tienes preferencias alimentarias o dispones de poco tiempo, cuéntanoslo antes de reservar o al hacer la reserva. Adaptaremos la ruta o el horario siempre que sea posible.',
    },
  },
  {
    id: 'faq-4',
    category: 'booking',
    question: {
      en: 'How can I book a tour or ask questions?',
      fr: 'Comment réserver ou poser une question ?',
      es: '¿Cómo puedo reservar una visita o hacer una consulta?',
    },
    answer: {
      en: 'You can book through the online reservation form on our site, or reach out to us directly via WhatsApp or email. We are always ready to answer your questions and coordinate details.',
      fr: 'Vous pouvez réserver via le formulaire de notre site ou nous contacter directement sur WhatsApp pour une réponse rapide.',
      es: 'Puedes reservar a través del formulario de nuestra web o contactar directamente con nosotros por WhatsApp o correo electrónico. Estamos disponibles para responder a tus preguntas y coordinar los detalles.',
    },
  },
  {
    id: 'faq-5',
    category: 'booking',
    question: {
      en: 'Can I book at short notice?',
      fr: 'Puis-je réserver à la dernière minute ?',
      es: '¿Puedo reservar con poca antelación?',
    },
    answer: {
      en: 'We always do our best to accommodate last-minute requests depending on guide and driver availability. For the widest choice of times and preferred language, we recommend booking a few days in advance.',
      fr: 'Nous faisons tout notre possible pour satisfaire les demandes de dernière minute selon la disponibilité de nos guides et véhicules.',
      es: 'Hacemos todo lo posible por atender las reservas de última hora según la disponibilidad de guías y conductores. Para tener más opciones de horarios y del idioma que prefieras, recomendamos reservar con unos días de antelación.',
    },
  },
  {
    id: 'faq-6',
    category: 'guides',
    question: {
      en: 'Are your guides native to Fez and what languages do they speak?',
      fr: 'Vos guides sont-ils locaux et quelles langues parlent-ils ?',
      es: '¿Vuestros guías son de Fez y qué idiomas hablan?',
    },
    answer: {
      en: 'Yes. We work with local guides who were born in and know Fez deeply. Depending on availability, our experiences can be conducted in English, French, and Spanish. Let us know if you require another language.',
      fr: 'Oui, nos guides sont natifs de Fès. Nous proposons des visites en anglais, français et espagnol, ainsi que d’autres langues sur demande.',
      es: 'Sí. Trabajamos con guías locales nacidos en Fez que conocen la ciudad a fondo. Según la disponibilidad, nuestras experiencias pueden realizarse en inglés, francés y español. Si necesitas otro idioma, consúltanos.',
    },
  },
  {
    id: 'faq-7',
    category: 'transport',
    question: {
      en: 'Where do we meet for a Medina tour? Can you pick us up from our riad?',
      fr: 'Où se fait le rendez-vous ? Pouvez-vous venir à notre riad ?',
      es: '¿Dónde nos encontramos para visitar la medina? ¿Podéis recogernos en nuestro riad?',
    },
    answer: {
      en: 'Common meeting points include Bab Boujloud or Bab Rcif. If your riad is located inside the pedestrian Medina, we can often meet you directly at your riad door, or at the closest accessible gate where walking begins.',
      fr: 'Les points de rencontre habituels sont Bab Boujloud ou Bab Rcif. Si votre riad est dans la médina, votre guide peut venir vous y rejoindre directement.',
      es: 'Los puntos de encuentro habituales son Bab Boujloud o Bab Rcif. Si vuestro riad está dentro de la medina peatonal, a menudo podemos encontrarnos directamente en su puerta o en la puerta de la medina accesible más cercana, desde donde empieza el paseo.',
    },
  },
  {
    id: 'faq-8',
    category: 'transport',
    question: {
      en: 'Do you provide transportation for day trips?',
      fr: 'Fournissez-vous le transport pour les excursions ?',
      es: '¿Incluís el transporte en las excursiones de un día?',
    },
    answer: {
      en: 'Yes. All our day trips outside Fez (Chefchaouen, Meknes/Volubilis, Ifrane) include comfortable, private, air-conditioned vehicles with trusted professional drivers who pick you up and drop you off directly at your accommodation.',
      fr: 'Oui, toutes nos excursions incluent un véhicule privé moderne et climatisé avec chauffeur professionnel, avec prise en charge aller-retour à votre hôtel.',
      es: 'Sí. Todas nuestras excursiones fuera de Fez, a Chefchaouen, Meknes/Volubilis e Ifrane, incluyen vehículos privados cómodos y con aire acondicionado, con conductores profesionales de confianza que os recogen y os dejan directamente en vuestro alojamiento.',
    },
  },
  {
    id: 'faq-9',
    category: 'walking',
    question: {
      en: 'Is the Old Medina difficult to walk around?',
      fr: 'La médina est-elle difficile pour la marche ?',
      es: '¿Es difícil recorrer a pie la antigua medina?',
    },
    answer: {
      en: 'The Medina involves walking along pedestrian streets that include slight slopes, steps, and uneven stones. You do not need to be a hiker, but comfortable walking shoes are strongly recommended. Since tours are private, we can take as many breaks as you like!',
      fr: 'La médina comprend des ruelles pavées et quelques marches. De bonnes chaussures de marche sont recommandées, et nous adaptons le rythme à vos souhaits.',
      es: 'En la medina se camina por calles peatonales con algunas cuestas, escalones y piedras irregulares. No hace falta ser senderista, pero recomendamos llevar calzado cómodo para caminar. Como las visitas son privadas, ¡podemos hacer tantas pausas como queráis!',
    },
  },
  {
    id: 'faq-10',
    category: 'food',
    question: {
      en: 'What food will we taste on the food tour, and can you accommodate dietary restrictions?',
      fr: 'Que mange-t-on lors du food tour et gérez-vous les allergies ?',
      es: '¿Qué probaremos en la ruta gastronómica y podéis adaptarla a restricciones alimentarias?',
    },
    answer: {
      en: 'Tastings vary with seasonal markets and include Harcha, Baghrir, Chebakia, Sfenj doughnuts, Bissara soup, local goat cheeses, olives, seasonal fruits, and mint tea. Please inform us of any allergies or dietary restrictions (vegetarian, nut allergies, etc.) when booking.',
      fr: 'Vous dégusterez Harcha, Baghrir, Chebakia, Sfenj, soupe Bissara, fromages locaux et thé à la menthe. Veuillez nous signaler vos éventuelles allergies dès la réservation.',
      es: 'Las degustaciones varían según los productos de temporada y pueden incluir Harcha, Baghrir, Chebakia, Sfenj, sopa Bissara, quesos de cabra locales, aceitunas, fruta de temporada y té a la menta. Al reservar, indícanos cualquier alergia o restricción alimentaria, como una dieta vegetariana o alergia a los frutos secos.',
    },
  },
  {
    id: 'faq-11',
    category: 'daytrips',
    question: {
      en: 'Which destinations can I visit on a day trip from Fez?',
      fr: 'Quelles sont les destinations possibles en excursion d’une journée ?',
      es: '¿Qué destinos puedo visitar en una excursión de un día desde Fez?',
    },
    answer: {
      en: 'Our popular day trips include Chefchaouen, Meknes with Volubilis and Moulay Idriss, and Ifrane in the Middle Atlas. We can also create custom private itineraries based on your wishes.',
      fr: 'Nos excursions phares sont Chefchaouen, Meknès avec Volubilis et Moulay Idriss, et Ifrane dans le Moyen Atlas.',
      es: 'Nuestras excursiones más populares incluyen Chefchaouen, Meknes con Volubilis y Moulay Idriss, e Ifrane en el Atlas Medio. También podemos preparar itinerarios privados a medida según tus preferencias.',
    },
  },
  {
    id: 'faq-12',
    category: 'general',
    question: {
      en: 'Do I need to carry cash in Fez?',
      fr: 'Dois-je avoir de l’argent liquide sur moi ?',
      es: '¿Necesito llevar efectivo en Fez?',
    },
    answer: {
      en: 'Yes. Carrying Moroccan Dirhams (MAD) in cash is very useful for Medina souks, local food stalls, taxis, and tips, where card machines are rarely available. ATMs are easily found near major gates.',
      fr: 'Oui, les espèces en dirhams (MAD) sont indispensables pour les petits achats, les marchés, les taxis et les pourboires dans la médina.',
      es: 'Sí. Llevar dírhams marroquíes (MAD) en efectivo es muy útil para los zocos de la medina, los puestos de comida, los taxis y las propinas, ya que rara vez hay datáfonos. Encontrarás cajeros fácilmente cerca de las puertas principales.',
    },
  },
];

// 7. DEFAULT BLOG & IN-DEPTH ARTICLES

// 8. DEFAULT SITE SETTINGS

// 9. DEFAULT CUSTOM PAGES
