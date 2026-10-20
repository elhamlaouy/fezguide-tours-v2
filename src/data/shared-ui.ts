import type { SiteSettings, BlogPost, CustomPage } from '../types';

export const UI_TEXT = {
  nav: {
    home: { en: 'Home', fr: 'Accueil', es: 'Inicio' },
    fez: { en: 'Fez', fr: 'Fès', es: 'Fez' },
    dayTrips: { en: 'Day Trips', fr: 'Excursions', es: 'Excursiones de un día' },
    foodTours: { en: 'Food Tours', fr: 'Tours Culinaires', es: 'Rutas gastronómicas' },
    travelTips: { en: 'Travel Tips', fr: 'Conseils Voyage', es: 'Consejos de viaje' },
    about: { en: 'About Us', fr: 'À Propos', es: 'Quiénes somos' },
    faq: { en: 'FAQ', fr: 'FAQ', es: 'Preguntas frecuentes' },
    bookTour: { en: 'Book an Experience', fr: 'Réserver une Expérience', es: 'Reservar una experiencia' },
  },
  common: {
    viewMore: { en: 'View More', fr: 'En Savoir Plus', es: 'Ver más' },
    explore: { en: 'Explore Details', fr: 'Explorer en détail', es: 'Ver los detalles' },
    bookNow: { en: 'Book This Tour', fr: 'Réserver ce Tour', es: 'Reservar esta visita' },
    close: { en: 'Close', fr: 'Fermer', es: 'Cerrar' },
    whatsappChat: { en: 'Talk to Someone Who Knows Fez', fr: 'Parlez à un local de Fès', es: 'Habla con alguien que conoce Fez' },
    duration: { en: 'Duration', fr: 'Durée', es: 'Duración' },
    groupSize: { en: 'Experience Format', fr: 'Format', es: 'Tipo de experiencia' },
    departure: { en: 'Meeting / Departure', fr: 'Départ / Rendez-vous', es: 'Punto de encuentro / Salida' },
    licensedGuides: { en: 'Local Guides & Drivers', fr: 'Guides Locaux & Chauffeurs', es: 'Guías y conductores locales' },
    highlights: { en: 'What You Discover', fr: 'Ce que vous découvrirez', es: 'Qué descubrirás' },
    included: { en: 'Included & Formats', fr: 'Inclusions & Formats', es: 'Qué incluye y modalidades' },
    fromPrice: { en: 'From', fr: 'À partir de', es: 'Desde' },
    allDepartments: { en: 'Explore Our City', fr: 'Découvrir la Ville', es: 'Descubre nuestra ciudad' },
  },
  hero: {
    tagline: {
      en: 'Fez Guide Tours — Discover the City Through Local Eyes',
      fr: 'Fez Guide Tours — Découvrez la Ville à Travers des Yeux Locaux',
      es: 'Fez Guide Tours — Descubre la ciudad con quienes viven en ella',
    },
    title: {
      en: 'Discover Fez in a Simple, Comfortable and Personal Way',
      fr: 'Découvrez Fès de Manière Simple, Confortable et Personnelle',
      es: 'Descubre Fez de una forma sencilla, cómoda y a tu medida',
    },
    subtitle: {
      en: 'We know the streets of the Medina, the local food, living traditions and everyday life. Private walking tours, food tastings, and relaxed day trips beyond the city.',
      fr: 'Nous connaissons les ruelles de la Médina, les saveurs locales, les traditions vivantes et le quotidien. Balades guidées privées, dégustations et excursions.',
      es: 'Conocemos las callejuelas de la medina, la gastronomía local, las tradiciones vivas y la vida cotidiana. Visitas privadas a pie, degustaciones y excursiones de un día sin prisas fuera de la ciudad.',
    },
    ctaExplore: {
      en: 'Explore Medina Experiences',
      fr: 'Explorer la Médina',
      es: 'Descubre las experiencias en la medina',
    },
    ctaDayTrips: {
      en: 'Day Trips Beyond Fez',
      fr: 'Excursions d’un Jour',
      es: 'Excursiones de un día desde Fez',
    },
  },
  homeQuickNav: {
    title: {
      en: 'Welcome to Fez. See the City Through Local Eyes.',
      fr: 'Bienvenue à Fès. Découvrez la ville à travers des yeux locaux.',
      es: 'Bienvenido a Fez. Descubre la ciudad con quienes viven en ella.',
    },
    subtitle: {
      en: 'Choose an experience designed around comfort, local knowledge, and genuine Moroccan hospitality.',
      fr: 'Choisissez une expérience pensée pour votre confort, votre curiosité et l’accueil marocain.',
      es: 'Elige una experiencia pensada para tu comodidad, con conocimiento local y auténtica hospitalidad marroquí.',
    },
  },
  trustBar: {
    badge1: {
      title: { en: 'Local Knowledge', fr: 'Expertise Locale', es: 'Conocimiento local' },
      desc: { en: 'Guides born and living in Fez', fr: 'Guides nés et vivants à Fès', es: 'Guías nacidos en Fez que viven en la ciudad' },
    },
    badge2: {
      title: { en: 'Private & Flexible', fr: 'Privé & Flexible', es: 'Privado y flexible' },
      desc: { en: 'For your group, at your own pace', fr: 'Pour votre groupe, à votre rythme', es: 'Para tu grupo y a vuestro ritmo' },
    },
    badge3: {
      title: { en: 'Comfortable Vehicles', fr: 'Véhicules Confortables', es: 'Vehículos cómodos' },
      desc: { en: 'Trusted drivers for scenic day trips', fr: 'Chauffeurs de confiance pour excursions', es: 'Conductores de confianza para excursiones entre paisajes' },
    },
    badge4: {
      title: { en: 'Living Heritage', fr: 'Patrimoine Vivant', es: 'Patrimonio vivo' },
      desc: { en: 'Craftsmen, food, and daily rhythm', fr: 'Artisans, cuisine et vie quotidienne', es: 'Artesanía, gastronomía y vida cotidiana' },
    },
  },
  footer: {
    aboutText: {
      en: 'Fez Guide Tours is a small local team based in Fez dedicated to sharing our city in a simple, comfortable and personal way. Discover Fez through local eyes.',
      fr: 'Fez Guide Tours est une équipe locale basée à Fès dédiée à partager notre ville de manière simple, confortable et authentique. Découvrez la ville à travers des yeux locaux.',
      es: 'Fez Guide Tours es un pequeño equipo local con sede en Fez, dedicado a compartir nuestra ciudad de una forma sencilla, cómoda y a tu medida. Descubre Fez con quienes viven en ella.',
    },
    quickLinks: { en: 'Quick Navigation', fr: 'Navigation Rapide', es: 'Enlaces rápidos' },
    contactUs: { en: 'Direct Contact', fr: 'Contact Direct', es: 'Contacto directo' },
    contactTitle: { en: 'Direct Contact & Inquiries', fr: 'Contact & Réservations', es: 'Contacto directo y consultas' },
    address: {
      en: 'Bab Boujloud, Medina of Fez, Morocco',
      fr: 'Bab Boujloud, Médina de Fès, Maroc',
      es: 'Bab Boujloud, medina de Fez, Marruecos',
    },
    trustBadges: {
      en: 'Local Native Hosts & Certified Medina Guides',
      fr: 'Hôtes Natifs & Guides Locaux Agréés',
      es: 'Anfitriones locales y guías acreditados de la medina',
    },
    rights: {
      en: 'All rights reserved. FezGuideTours — Discover Fez Through Local Eyes.',
      fr: 'Tous droits réservés. FezGuideTours — Découvrez Fès à travers des yeux locaux.',
      es: 'Todos los derechos reservados. FezGuideTours — Descubre Fez con quienes viven en ella.',
    },
    copyright: {
      en: '© 2026 FezGuideTours. All rights reserved. Welcome to Fez. See the city through local eyes.',
      fr: '© 2026 FezGuideTours. Tous droits réservés. Bienvenue à Fès. Découvrez la ville à travers des yeux locaux.',
      es: '© 2026 FezGuideTours. Todos los derechos reservados. Bienvenido a Fez. Descubre la ciudad con quienes viven en ella.',
    },
  },
};


export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'FezGuideTours',
  phoneNumber: '+212 719-603009',
  whatsappNumber: '212719603009',
  email: 'fezguidetours1@gmail.com',
  address: {
    en: 'Bab Boujloud, Medina of Fez, 30110 Morocco',
    fr: 'Bab Boujloud, Médina de Fès, 30110 Maroc',
    es: 'Bab Boujloud, medina de Fez, 30110 Marruecos',
  },
  licenseBadge: {
    en: 'Local Native Hosts & Certified Medina Guides',
    fr: 'Hôtes Natifs & Guides Locaux Agréés',
    es: 'Anfitriones locales y guías acreditados de la medina',
  },
  heroTagline: {
    en: 'Fez Guide Tours — Discover the City Through Local Eyes',
    fr: 'Fez Guide Tours — Découvrez la Ville à Travers des Yeux Locaux',
    es: 'Fez Guide Tours — Descubre la ciudad con quienes viven en ella',
  },
  heroTitle: {
    en: 'Discover Fez in a Simple, Comfortable and Personal Way',
    fr: 'Découvrez Fès de Manière Simple, Confortable et Personnelle',
    es: 'Descubre Fez de una forma sencilla, cómoda y a tu medida',
  },
  heroSubtitle: {
    en: 'We know the streets of the Medina, the local food, living traditions and everyday life. Private walking tours, food tastings, and relaxed day trips beyond the city.',
    fr: 'Nous connaissons les ruelles de la Médina, les saveurs locales, les traditions vivantes et le quotidien. Balades guidées privées, dégustations et excursions.',
    es: 'Conocemos las callejuelas de la medina, la gastronomía local, las tradiciones vivas y la vida cotidiana. Visitas privadas a pie, degustaciones y excursiones de un día sin prisas fuera de la ciudad.',
  },
  heroImage: '/images/real/about_us_image7.jpg',
  socialInstagram: 'https://instagram.com/fezguidetours',
  socialFacebook: 'https://facebook.com/fezguidetours',
  socialTripadvisor: 'https://www.tripadvisor.com/Attraction_Review-g293733-d33349838-Reviews-Fez_Guide_Tours-Fez_Fez_Meknes.html',
  googleMaps: 'https://maps.app.goo.gl/5aXiAV7FjS1W3qBj6',
};

export const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-food-tasting',
    slug: 'taste-fez-through-local-eyes',
    title: {
      en: 'Taste Fez Through Local Eyes: An Alley Safari of Street Food & Living Traditions',
      fr: 'Goûtez Fès à travers des yeux locaux : safari gourmand dans la médina',
      es: 'Saborea Fez con una mirada local: comida callejera y tradiciones vivas entre callejuelas',
    },
    excerpt: {
      en: 'To understand Fez, you should taste it. From morning Harcha and honey Baghrir to piping-hot Bissara and neighborhood bakeries.',
      fr: 'Pour comprendre Fès, il faut la goûter ! De la Harcha matinale à la Bissara fumante et aux fours de quartier.',
      es: 'Para entender Fez, hay que saborearla: desde la Harcha del desayuno y el Baghrir con miel hasta la Bissara bien caliente y las panaderías del barrio.',
    },
    content: {
      en: `Food in Fez is part of everyday life. It is found in small shops, bakeries, market stalls, traditional food places and family kitchens. It is the smell of bread coming from an oven, the sound of people ordering breakfast, the colours of spices in the market, a glass of Moroccan tea shared during a conversation, and small foods that people enjoy throughout the day.

Our food tasting walk takes you into this everyday side of the Medina. This is not simply a tour where you sit down for one large meal; we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets and local products while learning how they are connected to life in Fez.

Taste warm Harcha, honeycomb Baghrir, spicy Sfenj, freshly pressed olive oil, and steaming bowls of Bissara seasoned with cumin. Come hungry and leave with a true taste of Fez!`,
      fr: `La gastronomie fassie se découvre dans les petites échoppes et les fours communaux. Rejoignez-nous pour une balade sensorielle à travers les saveurs authentiques de la médina.`,
      es: `La comida forma parte de la vida cotidiana de Fez. Está en las pequeñas tiendas, las panaderías, los puestos del mercado, los establecimientos tradicionales y las cocinas familiares. Es el olor del pan recién salido del horno, el sonido de quienes piden el desayuno, los colores de las especias del mercado, un vaso de té marroquí compartido durante una conversación y los pequeños bocados que se disfrutan a lo largo del día.

Nuestra ruta de degustación te acerca a esta faceta cotidiana de la medina. No se trata de sentarse a tomar una única comida abundante: recorremos la antigua medina y hacemos paradas para descubrir y probar platos, tentempiés, dulces y productos locales mientras aprendemos qué relación tienen con la vida en Fez.

Prueba Harcha caliente, Baghrir con sus pequeños agujeros, Sfenj especiados, aceite de oliva recién prensado y cuencos humeantes de Bissara con comino. ¡Ven con hambre y llévate el auténtico sabor de Fez!`
    },
    coverImage: '/src/assets/images/real/food_tasting_walk_image1.jpg',
    category: { en: 'Food & Culinary', fr: 'Gastronomie', es: 'Gastronomía' },
    author: 'Med — FezGuideTours',
    date: '2026-09-28',
    readTime: { en: '4 min read', fr: '4 min de lecture', es: '4 min de lectura' },
    published: true,
  },
  {
    id: 'post-chefchaouen-daytrip',
    slug: 'chefchaouen-day-trip-guide',
    title: {
      en: 'Chefchaouen Day Trip: The Blue Pearl of Northern Morocco',
      fr: 'Excursion à Chefchaouen : La Perle Bleue du Nord du Maroc',
      es: 'Excursión a Chefchaouen: la perla azul del norte de Marruecos',
    },
    excerpt: {
      en: 'Spend a day discovering Chefchaouen: blue-painted alleys, Plaza Uta el-Hammam, the Kasbah, and the mountain spring of Ras El Maa.',
      fr: 'Une journée magique à Chefchaouen entre ruelles azurées, Kasbah historique et cascades de Ras El Maa.',
      es: 'Dedica un día a descubrir Chefchaouen: sus callejuelas azules, la Plaza Uta el-Hammam, la Kasbah y el manantial de montaña de Ras El Maa.',
    },
    content: {
      en: `Spend a day discovering Chefchaouen, the famous Blue City of northern Morocco, surrounded by the Rif Mountains.

After leaving Fez in a comfortable private vehicle, the journey takes you through rolling Moroccan countryside before climbing into the Rif Mountains. Once in Chefchaouen, walk through the old town where blue-painted walls and traditional houses create an extraordinary atmosphere.

Sit for a glass of Moroccan mint tea at Plaza Uta el-Hammam, visit the historic Kasbah, walk towards the mountain spring of Ras El Maa, and enjoy local handicrafts at your own relaxed pace.`,
      fr: `Partez de Fès pour une échappée montagnarde inoubliable vers la féerique cité bleue de Chefchaouen.`,
      es: `Dedica un día a descubrir Chefchaouen, la famosa ciudad azul del norte de Marruecos, rodeada por las montañas del Rif.

Tras salir de Fez en un cómodo vehículo privado, el recorrido atraviesa las colinas del campo marroquí antes de adentrarse en las montañas del Rif. En Chefchaouen, pasea por el casco antiguo, donde las paredes azules y las casas tradicionales crean un ambiente extraordinario.

Siéntate a tomar un té marroquí a la menta en la Plaza Uta el-Hammam, visita la histórica Kasbah, camina hasta el manantial de montaña de Ras El Maa y descubre la artesanía local a tu ritmo, sin prisas.`
    },
    coverImage: '/src/assets/images/real/daytrip_chefchaouen_image1.jpg',
    category: { en: 'Day Trips', fr: 'Excursions', es: 'Excursiones de un día' },
    author: 'Med — FezGuideTours',
    date: '2026-09-29',
    readTime: { en: '5 min read', fr: '5 min de lecture', es: '5 min de lectura' },
    published: true,
  },
  {
    id: 'post-getting-around-fez',
    slug: 'getting-around-fez-medina-gates-taxis',
    title: {
      en: 'Getting Around Fez: Walking, Medina Gates & Red Petit Taxis',
      fr: 'Se Déplacer à Fès : Rues Piétonnes, Portes & Taxis Rouges',
      es: 'Cómo moverse por Fez: paseos, puertas de la medina y pequeños taxis rojos',
    },
    excerpt: {
      en: 'Everything you need to know about navigating the pedestrian Old Medina and using red Petit Taxis (10–20 MAD) with ease.',
      fr: 'Tout ce qu’il faut savoir pour se déplacer facilement entre la médina piétonne et la Ville Nouvelle.',
      es: 'Todo lo que necesitas saber para orientarte en la antigua medina peatonal y utilizar con facilidad los pequeños taxis rojos (10–20 MAD).',
    },
    content: {
      en: `Getting around Fez is different from moving around a modern city. The Old Medina was built around walking, with narrow streets and pedestrian passages. Outside the Medina, red Petit Taxis are convenient, metered, and typically cost 10–20 MAD for local trips.

Remember key gate names like Bab Boujloud, Bab Rcif, and Batha to make your pickup and drop-off effortless!`,
      fr: `Comprenez les portes clés de la médina et le fonctionnement des petits taxis rouges pour vous déplacer comme un habitant.`,
      es: `Moverse por Fez es distinto de desplazarse por una ciudad moderna. La antigua medina está pensada para caminar, con calles estrechas y pasajes peatonales. Fuera de la medina, los pequeños taxis rojos son prácticos, tienen taxímetro y suelen costar entre 10 y 20 MAD para los trayectos locales.

¡Recuerda los nombres de los principales accesos, como Bab Boujloud, Bab Rcif y Batha, para que resulte sencillo acordar dónde te recogen y dónde te dejan!`
    },
    coverImage: '/src/assets/images/real/tips_getting_around_image1.jpg',
    category: { en: 'Travel Tips', fr: 'Conseils Voyage', es: 'Consejos de viaje' },
    author: 'Med — FezGuideTours',
    date: '2026-09-30',
    readTime: { en: '3 min read', fr: '3 min de lecture', es: '3 min de lectura' },
    published: true,
  },
];


export const DEFAULT_CUSTOM_PAGES: CustomPage[] = [
  {
    id: 'page-bespoke-itinerary',
    slug: 'bespoke-morocco-experiences',
    title: {
      en: 'Bespoke Private Journeys from Fez',
      fr: 'Voyages Sur Mesure au départ de Fès',
      es: 'Viajes privados a medida desde Fez',
    },
    subtitle: {
      en: 'Tailor-Made Multiday Routes & Specialized Cultural Visits',
      fr: 'Circuits personnalisés de plusieurs jours et visites thématiques',
      es: 'Rutas de varios días a medida y visitas culturales temáticas',
    },
    heroImage: '/src/assets/images/real/daytrip_custom_image1.jpg',
    content: {
      en: `Have a specific interest or need multi-day arrangements starting from Fez? We organize custom private experiences tailored around your travel style. Whether you wish to explore the Middle Atlas, visit artisan ceramics workshops, take part in an authentic cooking class in a Medina home, or journey south toward the desert, we coordinate every detail with trusted local partners.`,
      fr: `Vous avez un projet de voyage particulier ? Nous créons des circuits sur mesure au départ de Fès avec véhicules privés confortables et accompagnement local de confiance.`,
      es: `¿Tienes un interés concreto o necesitas organizar un viaje de varios días desde Fez? Preparamos experiencias privadas a medida según tu forma de viajar. Tanto si quieres explorar el Atlas Medio como visitar talleres artesanales de cerámica, participar en una auténtica clase de cocina en una casa de la medina o viajar hacia el sur en dirección al desierto, coordinamos cada detalle con colaboradores locales de confianza.`
    },
    highlights: {
      en: [
        'Personalized itinerary planning with Med and our local team',
        'Comfortable air-conditioned private vehicles with dedicated drivers',
        'Authentic Medina experiences (cooking workshops, artisan studio visits)',
        'Flexible schedules adapted to your family, group, or solo travel needs'
      ],
      fr: [
        'Conception d’itinéraire sur mesure avec Med et notre équipe',
        'Véhicules privés confortables et climatisés avec chauffeur dédié',
        'Expériences immersives (ateliers de cuisine, rencontres avec artisans)',
        'Flexibilité totale adaptée aux familles, couples et voyageurs solos'
      ],
      es: [
        'Planificación de itinerarios a medida con Med y nuestro equipo local',
        'Vehículos privados cómodos y con aire acondicionado, con conductores dedicados',
        'Experiencias auténticas en la medina: talleres de cocina y visitas a talleres artesanales',
        'Horarios flexibles adaptados a tu familia, tu grupo o tus necesidades si viajas por tu cuenta'
      ]
    },
    showInNav: false,
    published: true,
    createdAt: '2026-10-01',
  },
];
