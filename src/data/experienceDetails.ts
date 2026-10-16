import { Language, ItineraryStop } from '../types';

export interface ExperienceExtraDetails {
  galleryImages: string[];
  itinerary: ItineraryStop[];
  included: Record<Language, string[]>;
  excluded: Record<Language, string[]>;
  whatToBring: Record<Language, string[]>;
  meetingPointDetails: Record<Language, string>;
  cancellationPolicy: Record<Language, string>;
  suitableFor: Record<Language, string[]>;
  reviews: Array<{
    author: string;
    location: string;
    rating: number;
    date: string;
    comment: Record<Language, string>;
  }>;
}

export const EXPERIENCE_EXTRAS: Record<string, ExperienceExtraDetails> = {
  // ===================== 1. FEZ: EXPLORE THE MEDINA =====================
  'fez-explore-medina': {
    galleryImages: [
      '/images/real/about_us_image7.jpg',
      '/images/real/fez_explore_medina_image1.jpg',
      '/images/real/fez_explore_medina_image2.jpg',
      '/images/real/fez_explore_medina_image3.jpg',
      '/images/real/fez_explore_medina_image4.jpg',
      '/images/real/fez_explore_medina_image7.jpg',
    ],
    itinerary: [
      {
        time: '09:30 AM',
        title: {
          en: 'Bab Boujloud (The Blue Gate) & Tala’a Kbira',
          fr: 'Bab Boujloud (La Porte Bleue) & Tala’a Kbira',
          es: 'Bab Boujloud (la Puerta Azul) y Tala’a Kbira',
        },
        description: {
          en: 'Meet your licensed native guide under the cobalt blue arches of Bab Boujloud. Begin descending Tala’a Kbira, the vibrant historic spine of Fes el-Bali.',
          fr: 'Retrouvez votre guide officiel sous les superbes faïences bleues de Bab Boujloud. Descente de Tala’a Kbira, l’artère médiévale emblématique.',
          es: 'Encuentra a tu guía local acreditado bajo los arcos azul cobalto de Bab Boujloud. Comienza a bajar por Tala’a Kbira, la animada arteria histórica de Fes el-Bali.',
        },
        badge: { en: 'Historic Gateway', fr: 'Porte Emblématique', es: 'Puerta histórica' },
      },
      {
        time: '10:30 AM',
        title: {
          en: 'Bou Inania Madrasa & Water Clock (Dar al-Magana)',
          fr: 'Médersa Bou Inania & Horloge Hydraulique',
          es: 'Madraza Bou Inania y reloj de agua (Dar al-Magana)',
        },
        description: {
          en: 'Explore the 14th-century Marinid architectural masterpiece with its intricate stucco, carved cedarwood, and hand-cut geometric zellige tiles.',
          fr: 'Découverte de ce chef-d’œuvre mérinide du XIVe siècle, orné de stucs délicats, de bois de cèdre sculpté et de zelliges géométriques.',
          es: 'Descubre esta obra maestra de la arquitectura meriní del siglo XIV, con sus delicados estucos, madera de cedro tallada y azulejos geométricos de zellige cortados a mano.',
        },
        badge: { en: 'Architecture', fr: 'Architecture', es: 'Arquitectura' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Living Craftsmen Quarters & Hidden Workshops',
          fr: 'Quartiers des Métiers & Ateliers Vivants',
          es: 'Barrios de artesanos y talleres escondidos',
        },
        description: {
          en: 'Venture into the heart of the artisan guilds: copper beating in Place Seffarine, loom weaving of agave cactus silk, and master woodworking.',
          fr: 'Immersion au cœur des corporations d’artisans : dinandiers de la place Seffarine, tisserands de soie végétale et ébénistes.',
          es: 'Adéntrate en el corazón de los gremios artesanos: el trabajo del cobre en la plaza Seffarine, el tejido de seda vegetal de agave y la ebanistería tradicional.',
        },
        badge: { en: 'Artisans', fr: 'Artisans', es: 'Artesanos' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Chouara Tannery & Leather Heritage',
          fr: 'Tannerie Chouara & Savoir-Faire du Cuir',
          es: 'Curtiduría Chouara y tradición del cuero',
        },
        description: {
          en: 'View the world-famous natural stone dye vats from a terrace with fresh mint. Learn the medieval tanning process preserved unchanged since the 11th century.',
          fr: 'Vue panoramique sur les fosses de teinture naturelle du XIe siècle avec un brin de menthe fraîche et explications détaillées.',
          es: 'Contempla las famosas cubas de piedra para tintes naturales desde una terraza, con una ramita de menta fresca. Conoce el proceso medieval de curtido, conservado desde el siglo XI.',
        },
        badge: { en: 'World Famous', fr: 'Incontournable', es: 'Fama mundial' },
      },
      {
        time: '02:00 PM',
        title: {
          en: 'Panoramic Rooftop Lookout & Fresh Mint Tea',
          fr: 'Panorama sur les Toits & Pause Thé à la Menthe',
          es: 'Terraza panorámica y té de menta',
        },
        description: {
          en: 'Conclude your walk at a quiet historic rooftop terrace overlooking the sea of minarets and medieval rooftops, sharing local tea and conversation.',
          fr: 'Terminez votre balade sur un toit-terrasse paisible offrant une vue saisissante sur les minarets et toitures médiévales.',
          es: 'Termina el paseo en una tranquila terraza histórica con vistas a los minaretes y tejados medievales, compartiendo té local y una buena conversación.',
        },
        badge: { en: 'Panoramic View', fr: 'Vue Panoramique', es: 'Vista panorámica' },
      },
    ],
    included: {
      en: [
        'Official licensed English/French/Arabic-speaking local guide born in Fez',
        '100% Private tour exclusively for your family or traveling group',
        'Riad or hotel meeting & pickup in/near the Medina',
        'Flexible pacing suited to your walking comfort and photography wishes',
        'Traditional Moroccan mint tea break at a panoramic scenic viewpoint',
        'Honest local advice: no tourist shopping traps or forced commission stops',
      ],
      fr: [
        'Guide officiel agréé natif de Fès (Français / Anglais / Arabe)',
        'Visite 100% privée réservée exclusivement à votre groupe',
        'Prise en charge à votre riad ou hôtel à l’entrée de la médina',
        'Rythme personnalisé adapté à vos envies et séances photos',
        'Pause thé à la menthe marocain traditionnel sur un toit panoramique',
        'Conseils authentiques et absence totale de boutiques imposées',
      ],
      es: [
        'Guía local oficial acreditado, nacido en Fez, que habla inglés, francés y árabe',
        'Visita 100% privada, exclusiva para tu familia o grupo de viaje',
        'Encuentro y recogida en tu riad u hotel dentro o cerca de la medina',
        'Ritmo flexible adaptado a tu comodidad al caminar y a tus preferencias fotográficas',
        'Pausa para tomar té de menta marroquí tradicional en un mirador panorámico',
        'Consejos locales sinceros: sin trampas para turistas ni paradas de compras obligatorias',
      ],
    },
    excluded: {
      en: [
        'Entrance fees to historic monuments (e.g. Bou Inania Madrasa ~20 MAD)',
        'Lunch (recommendations provided upon request)',
        'Personal souvenirs or shopping',
        'Discretionary gratuity/tip for the guide',
      ],
      fr: [
        'Billets d’entrée aux monuments historiques (ex: Médersa Bou Inania ~20 MAD)',
        'Déjeuner (bonnes adresses locales suggérées sur place)',
        'Achats et dépenses personnelles',
        'Pourboire discrétionnaire pour votre guide',
      ],
      es: [
        'Entradas a monumentos históricos (p. ej., madraza Bou Inania ~20 MAD)',
        'Almuerzo (recomendaciones disponibles si las necesitas)',
        'Recuerdos y compras personales',
        'Propina opcional para el guía',
      ],
    },
    whatToBring: {
      en: [
        'Comfortable walking shoes with good grip for cobblestone paths',
        'Sun protection: sunglasses, hat, and light sunscreen',
        'Camera or smartphone for authentic street photography',
        'Cash in Moroccan Dirhams (MAD) for small entrance fees and drinks',
        'Modest clothing respecting local community culture',
      ],
      fr: [
        'Chaussures de marche confortables adaptées aux ruelles pavées',
        'Protection solaire : lunettes, chapeau et crème',
        'Appareil photo ou smartphone pour immortaliser les ruelles',
        'Espèces en Dirhams (MAD) pour les petites entrées et souvenirs',
        'Tenue sobre et respectueuse des traditions locales',
      ],
      es: [
        'Calzado cómodo con buen agarre para las calles empedradas',
        'Protección solar: gafas de sol, sombrero y crema solar ligera',
        'Cámara o móvil para fotografiar la vida de las calles',
        'Efectivo en dírhams marroquíes (MAD) para pequeñas entradas y bebidas',
        'Ropa discreta y respetuosa con las costumbres locales',
      ],
    },
    meetingPointDetails: {
      en: 'Direct pickup at your Riad or Hotel inside or adjacent to the Medina, or at the landmark monument Bab Boujloud (outside Café Clock).',
      fr: 'Prise en charge à votre Riad ou hôtel dans la Médina, ou devant la grande porte Bab Boujloud.',
      es: 'Recogida en tu riad u hotel dentro o junto a la medina, o encuentro en Bab Boujloud (delante de Café Clock).',
    },
    cancellationPolicy: {
      en: 'Free cancellation with 100% refund up to 24 hours prior to tour departure.',
      fr: 'Annulation gratuite avec remboursement intégral jusqu’à 24 heures avant le départ.',
      es: 'Cancelación gratuita con reembolso íntegro hasta 24 horas antes de la salida.',
    },
    suitableFor: {
      en: ['Couples & Solos', 'Families with Children', 'Photography Enthusiasts', 'First-Time Morocco Visitors'],
      fr: ['Couples & Voyageurs solos', 'Familles avec enfants', 'Passionnés de photographie', 'Premier voyage au Maroc'],
      es: ['Parejas y viajeros en solitario', 'Familias con niños', 'Aficionados a la fotografía', 'Quienes visitan Marruecos por primera vez'],
    },
    reviews: [
      {
        author: 'Sarah & Mark Jenkins',
        location: 'London, United Kingdom',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'Booking this private Medina tour with Med was hands down the best decision of our Morocco trip. We would have gotten hopelessly lost without him, but more importantly, he opened up doors to real workshops and explained the soul of Fez. Truly unforgettable!',
          fr: 'Réserver cette visite privée avec Med a été la meilleure décision de notre séjour. Il nous a fait découvrir des ateliers cachés et expliqué l’âme de Fès avec passion. Inoubliable !',
          es: 'Reservar esta visita privada a la medina con Med fue, sin duda, la mejor decisión de nuestro viaje a Marruecos. Sin él nos habríamos perdido, pero lo más importante fue que nos abrió las puertas de talleres de verdad y nos explicó el alma de Fez. ¡Inolvidable!',
        },
      },
      {
        author: 'Antoine de Saint-Germain',
        location: 'Bordeaux, France',
        rating: 5,
        date: 'August 2026',
        comment: {
          en: 'A profound cultural immersion. No pushy shops, pure history and heartwarming human encounters in the quiet residential alleys. 10/10.',
          fr: 'Une immersion culturelle profonde. Pas de boutiques pièges, de la pure histoire et des rencontres humaines chaleureuses. 10/10.',
          es: 'Una inmersión cultural profunda. Sin tiendas insistentes, solo historia y encuentros entrañables en las tranquilas callejuelas residenciales. 10/10.',
        },
      },
    ],
  },

  // ===================== 2. FEZ: HISTORY, CULTURE & LANDMARKS =====================
  'fez-history-culture': {
    galleryImages: [
      '/images/real/fez_history_culture_image1.jpg',
      '/images/real/fez_history_culture_image2.jpg',
      '/images/real/fez_history_culture_image10.jpg',
      '/images/real/fez_history_culture_image11.jpg',
      '/images/real/fez_history_culture_image12.jpg',
      '/images/real/fez_history_culture_image13.jpg',
    ],
    itinerary: [
      {
        time: '09:00 AM',
        title: {
          en: 'The Royal Palace of Fez (Dar al-Makhzen)',
          fr: 'Le Palais Royal de Fès (Dar al-Makhzen)',
          es: 'Palacio Real de Fez (Dar al-Makhzen)',
        },
        description: {
          en: 'Admire the monumental 7 bronze gates of the Royal Palace, adorned with hand-chiseled brass arabesques and zellige mosaic patterns.',
          fr: 'Contemplez les 7 majestueuses portes en bronze ciselé du Palais Royal et leurs décors de faïence zellige éclatants.',
          es: 'Admira las siete puertas monumentales de bronce del Palacio Real, adornadas con arabescos de latón cincelados a mano y mosaicos de zellige.',
        },
        badge: { en: 'Royal Splendor', fr: 'Splendeur Royale', es: 'Esplendor real' },
      },
      {
        time: '10:00 AM',
        title: {
          en: 'The Historic Jewish Mellah & Ibn Danan Synagogue',
          fr: 'Le Mellah Historique & Synagogue Ibn Danan',
          es: 'Mellah histórico y sinagoga Ibn Danan',
        },
        description: {
          en: 'Walk the distinctive wrought-iron balcony streets of the Mellah, visiting the 17th-century restored Ibn Danan Synagogue and Jewish cemetery.',
          fr: 'Parcourez les ruelles aux balcons en fer forgé du Mellah, visitez la synagogue du XVIIe siècle et le cimetière israélite.',
          es: 'Recorre las calles del Mellah con sus característicos balcones de hierro forjado y visita la sinagoga Ibn Danan, restaurada y del siglo XVII, y el cementerio judío.',
        },
        badge: { en: 'Shared Heritage', fr: 'Mémoire Partagée', es: 'Patrimonio compartido' },
      },
      {
        time: '11:15 AM',
        title: {
          en: 'Al-Qarawiyyin University & Historic Quarter',
          fr: 'Université Al Quaraouiyine & Quartier Historique',
          es: 'Universidad Al-Qarawiyyin y barrio histórico',
        },
        description: {
          en: 'Founded in 859 AD by Fatima al-Fihri, recognized by UNESCO as the oldest existing educational institution in the world.',
          fr: 'Fondée en 859 par Fatima al-Fihri, reconnue par l’UNESCO comme la plus ancienne université au monde encore en activité.',
          es: 'Fundada en el año 859 por Fatima al-Fihri y reconocida por la UNESCO como la institución educativa en funcionamiento más antigua del mundo.',
        },
        badge: { en: 'UNESCO Legacy', fr: 'Patrimoine UNESCO', es: 'Legado UNESCO' },
      },
      {
        time: '12:30 PM',
        title: {
          en: 'Al-Attarine Madrasa & Nejjarine Wood Museum',
          fr: 'Médersa Al-Attarine & Musée Nejjarine du Bois',
          es: 'Madraza Al-Attarine y Museo de la Madera Nejjarine',
        },
        description: {
          en: 'Discover the pinnacles of Islamic calligraphy, cedar carving, and the grand restored 18th-century fondouk in Place Nejjarine.',
          fr: 'Découvrez les sommets de la calligraphie islamique et l’ancien fondouk caravanier du XVIIIe siècle magnifiquement restauré.',
          es: 'Descubre obras maestras de la caligrafía islámica y la talla de cedro, y el gran fondouk del siglo XVIII restaurado en la plaza Nejjarine.',
        },
        badge: { en: 'Masterpieces', fr: 'Chefs-d’œuvre', es: 'Obras maestras' },
      },
    ],
    included: {
      en: [
        'Dedicated licensed university-trained historian & Medina guide',
        '100% Private tour customized to your historical and architectural interests',
        'Private comfortable transport between Royal Palace/Mellah and Medina gate',
        'Detailed commentary on Islamic geometry, Jewish heritage, and Andalusian architecture',
        'Bottled mineral water during the tour',
      ],
      fr: [
        'Guide historien officiel agréé spécialiste du patrimoine médiéval',
        'Visite 100% privée adaptée à votre rythme et vos centres d’intérêt',
        'Transfert en véhicule privé climatisé entre le Palais Royal/Mellah et la médina',
        'Explications approfondies sur la géométrie islamique et l’histoire andalouse',
        'Bouteille d’eau minérale offerte',
      ],
      es: [
        'Guía e historiador acreditado con formación universitaria, especializado en la medina',
        'Visita 100% privada adaptada a tus intereses históricos y arquitectónicos',
        'Transporte privado cómodo entre el Palacio Real, el Mellah y la entrada de la medina',
        'Explicaciones detalladas sobre geometría islámica, patrimonio judío y arquitectura andalusí',
        'Agua mineral embotellada durante la visita',
      ],
    },
    excluded: {
      en: ['Monument entrance fees (~20 to 50 MAD per site)', 'Lunch & personal expenses', 'Guide gratuity'],
      fr: ['Entrées aux monuments (~20 à 50 MAD par site)', 'Déjeuner & dépenses personnelles', 'Pourboire'],
      es: ['Entradas a monumentos (~20 a 50 MAD por lugar)', 'Almuerzo y gastos personales', 'Propina para el guía'],
    },
    whatToBring: {
      en: ['Walking shoes', 'Camera with zoom lens', 'Cash in MAD', 'Scarf for visits near sacred sites'],
      fr: ['Chaussures confortables', 'Appareil photo', 'Dirhams en espèces', 'Foulard léger'],
      es: ['Calzado cómodo para caminar', 'Cámara con zoom', 'Efectivo en MAD', 'Pañuelo para las visitas cerca de lugares sagrados'],
    },
    meetingPointDetails: {
      en: 'Riad/Hotel pickup in Fez or Royal Palace Bab Dekkakin meeting point.',
      fr: 'Prise en charge à votre hébergement ou devant Bab Dekkakin.',
      es: 'Recogida en tu riad u hotel de Fez, o encuentro en Bab Dekkakin, en el Palacio Real.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours in advance.',
      fr: 'Annulation gratuite jusqu’à 24h avant l’activité.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['History Buffs', 'Architecture Lovers', 'Academics & Cultural Travelers', 'Families'],
      fr: ['Amateurs d’histoire', 'Passionnés d’architecture', 'Voyageurs culturels', 'Familles'],
      es: ['Aficionados a la historia', 'Amantes de la arquitectura', 'Investigadores y viajeros culturales', 'Familias'],
    },
    reviews: [
      {
        author: 'Dr. Rebecca Stern',
        location: 'Chicago, USA',
        rating: 5,
        date: 'October 2026',
        comment: {
          en: 'Our guide was a walking encyclopedia of Moroccan history. Learning how the Mellah, the Marinid sultans, and Al-Qarawiyyin intertwined was captivating. Best historical tour I have ever taken!',
          fr: 'Notre guide était une véritable encyclopédie vivante. L’histoire du Mellah et d’Al Quaraouiyine était captivante.',
          es: 'Nuestro guía era una enciclopedia viviente de la historia de Marruecos. Conocer la relación entre el Mellah, los sultanes meriníes y Al-Qarawiyyin fue fascinante. ¡La mejor visita histórica que he hecho!',
        },
      },
    ],
  },

  // ===================== 3. FEZ: THINGS TO DO IN FEZ =====================
  'fez-things-to-do': {
    galleryImages: [
      '/images/real/fez_things_to_do_image1.jpg',
      '/images/real/fez_things_to_do_image2.jpg',
      '/images/real/fez_things_to_do_image3.jpg',
      '/images/real/fez_things_to_do_image4.jpg',
      '/images/real/fez_things_to_do_image5.jpg',
      '/images/real/about_us_image3.jpg',
    ],
    itinerary: [
      {
        time: '10:00 AM',
        title: {
          en: 'Zellige & Pottery Co-op Live Hands-on Masterclass',
          fr: 'Coopérative de Poterie & Zellige : Démonstration en Direct',
          es: 'Cooperativa de cerámica y zellige: taller práctico en directo',
        },
        description: {
          en: 'Watch artisans knead grey clay from the local hills, spin potter’s wheels with their feet, and chip intricate zellige mosaic tesserae by hand with a heavy hammer.',
          fr: 'Observez les potiers façonner l’argile grise au tour et les maîtres artisans tailler les fragments de zellige avec leur marteau traditionnel.',
          es: 'Observa cómo los artesanos amasan la arcilla gris de las colinas locales, mueven el torno con los pies y tallan a mano las pequeñas piezas de zellige con un pesado martillo.',
        },
        badge: { en: 'Handmade Craft', fr: 'Artisanat d’Art', es: 'Artesanía hecha a mano' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Souk el-Attarine: Spices, Herbs & Pure Argan',
          fr: 'Souk el-Attarine : Épices, Plantes & Huile d’Argan Pure',
          es: 'Souk el-Attarine: especias, hierbas y argán puro',
        },
        description: {
          en: 'Immerse your senses in cones of saffron, paprika, cumin, amber resin, and rosewater. Learn how locals use medicinal herbs in daily life.',
          fr: 'Éveillez vos sens devant les pyramides de safran, cumin, résines d’ambre et eau de rose distillée.',
          es: 'Despierta los sentidos entre montones de azafrán, pimentón, comino, resina de ámbar y agua de rosas. Descubre cómo se usan las hierbas medicinales en la vida cotidiana.',
        },
        badge: { en: 'Sensory Souk', fr: 'Souk des Épices', es: 'Zoco de los sentidos' },
      },
      {
        time: '01:15 PM',
        title: {
          en: 'Seffarine Brass & Copper Coppersmithing',
          fr: 'Place Seffarine : Dinanderie & Cuivre Martelé',
          es: 'Seffarine: artesanía del latón y el cobre',
        },
        description: {
          en: 'The rhythmic music of coppersmiths hammering giant couscous steamers, teapots, and ornate brass trays under the shade of ancient plane trees.',
          fr: 'Le tintement mélodieux des marteaux forgeant les théières, chaudrons à couscous et plateaux en cuivre ciselé.',
          es: 'Escucha el ritmo de los caldereros mientras martillean grandes cuscuseras, teteras y bandejas de latón decoradas a la sombra de plátanos centenarios.',
        },
        badge: { en: 'Living Sound', fr: 'Ambiance Vivante', es: 'Sonidos de la vida local' },
      },
      {
        time: '05:30 PM',
        title: {
          en: 'Sunset at Merenid Tombs & Borj Nord Overlook',
          fr: 'Coucher de Soleil aux Tombeaux Mérinides & Borj Nord',
          es: 'Atardecer en las tumbas meriníes y el mirador de Borj Nord',
        },
        description: {
          en: 'End the day with a dramatic golden hour view watching the call to prayer echo across the 10,000 rooftops of the medieval Medina.',
          fr: 'Clôturez la journée avec un coucher de soleil grandiose alors que l’appel à la prière résonne sur les toits de la médina.',
          es: 'Termina el día con las vistas de la hora dorada mientras la llamada a la oración resuena sobre los 10.000 tejados de la medina medieval.',
        },
        badge: { en: 'Golden Hour', fr: 'Coucher de Soleil', es: 'Hora dorada' },
      },
    ],
    included: {
      en: [
        'Private certified guide dedicated to your schedule',
        'Private round-trip transport to the Pottery cooperative & scenic viewpoints',
        'Live artisan demonstrations in pottery, zellige, weaving, and copper',
        'Insider tips for genuine quality items and fair negotiations',
      ],
      fr: [
        'Guide certifié dédié exclusivement à votre famille/groupe',
        'Transport privé aller-retour vers la poterie et les belvédères',
        'Démonstrations d’artisanat en direct',
        'Conseils impartiaux pour distinguer le vrai artisanat des imitations',
      ],
      es: [
        'Guía privado acreditado dedicado a tu programa',
        'Transporte privado de ida y vuelta a la cooperativa de cerámica y los miradores',
        'Demostraciones en directo de cerámica, zellige, tejido y trabajo del cobre',
        'Consejos locales para reconocer piezas de calidad y negociar precios justos',
      ],
    },
    excluded: {
      en: ['Personal purchases', 'Meals and drinks', 'Tips for artisans & guide'],
      fr: ['Achats personnels', 'Repas et consommations', 'Pourboires'],
      es: ['Compras personales', 'Comidas y bebidas', 'Propinas para artesanos y guía'],
    },
    whatToBring: {
      en: ['Flat comfortable shoes', 'Tote bag for souvenirs', 'Cash for shopping', 'Camera'],
      fr: ['Chaussures plates confortables', 'Sac pour emplettes', 'Espèces', 'Appareil photo'],
      es: ['Calzado plano y cómodo', 'Bolsa para los recuerdos', 'Efectivo para compras', 'Cámara'],
    },
    meetingPointDetails: {
      en: 'Pickup from your Riad or centrally located hotel in Fez.',
      fr: 'Prise en charge à votre riad ou hôtel à Fès.',
      es: 'Recogida en tu riad u hotel céntrico de Fez.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to experience.',
      fr: 'Annulation gratuite jusqu’à 24 heures avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['Shoppers & Craft Lovers', 'Families', 'Design & Art Enthusiasts', 'Couples'],
      fr: ['Amateurs d’artisanat', 'Familles', 'Passionnés de design', 'Couples'],
      es: ['Amantes de las compras y la artesanía', 'Familias', 'Aficionados al diseño y al arte', 'Parejas'],
    },
    reviews: [
      {
        author: 'Elena Rostova',
        location: 'Milan, Italy',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'Watching the zellige masters piece together mosaics was like seeing living magic. And the sunset from the Merenid Tombs took my breath away. Perfect day in Fez!',
          fr: 'Voir les maîtres du zellige assembler les mosaïques était magique. Et le coucher de soleil aux tombeaux mérinides est sublime.',
          es: 'Ver a los maestros del zellige montar los mosaicos fue como presenciar magia en vivo. Y el atardecer desde las tumbas meriníes me dejó sin aliento. ¡Un día perfecto en Fez!',
        },
      },
    ],
  },

  // ===================== 4. DAY TRIP: CHEFCHAOUEN =====================
  'daytrip-chefchaouen': {
    galleryImages: [
      '/images/daytrip-chefchaouen/blue-alley.webp',
    ],
    itinerary: [
      {
        time: '08:00 AM',
        title: {
          en: 'Departure from Fez & Scenic Rif Mountain Drive',
          fr: 'Départ de Fès & Traversée des Montagnes du Rif',
          es: 'Salida de Fez y recorrido panorámico por las montañas del Rif',
        },
        description: {
          en: 'Your private air-conditioned vehicle picks you up at your Riad. Enjoy a scenic 3.5-hour journey through olive groves, dams, and Rif mountain passes with coffee stops.',
          fr: 'Prise en charge à votre Riad en véhicule moderne climatisé. Magnifique trajet de 3h30 à travers les paysages du Rif avec pauses café.',
          es: 'Tu vehículo privado con aire acondicionado te recoge en el riad. Disfruta de un trayecto panorámico de 3,5 horas entre olivares, embalses y puertos del Rif, con paradas para tomar café.',
        },
        badge: { en: 'Scenic Drive', fr: 'Route Panoramique', es: 'Ruta panorámica' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Arrival at Chefchaouen & Outa el-Hammam Square',
          fr: 'Arrivée à Chefchaouen & Place Outa el-Hammam',
          es: 'Llegada a Chefchaouen y plaza Outa el-Hammam',
        },
        description: {
          en: 'Step into the tranquil blue pearl of Morocco. Explore the central plaza surrounded by red-walled Kasbah towers, cafes, and cedar-shaded patios.',
          fr: 'Entrez dans la perle bleue du Maroc. Découvrez la place centrale entourée de la Kasbah aux murs ocre et de terrasses ombragées.',
          es: 'Entra en la tranquila perla azul de Marruecos. Descubre la plaza central, rodeada de las torres de muros rojos de la kasbah, cafés y patios a la sombra de los cedros.',
        },
        badge: { en: 'Blue Pearl', fr: 'Perle Bleue', es: 'Perla azul' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Exploring the Blue Alleys & Ras El Maa',
          fr: 'Balade dans les Ruelles Bleues & Source Ras el-Maa',
          es: 'Paseo por las callejuelas azules y Ras el-Maa',
        },
        description: {
          en: 'Stroll the famous cobalt-washed stairways, discover Berber wool blankets, and walk to the fresh mountain spring of Ras el-Maa where locals gather.',
          fr: 'Flânez dans les ruelles peintes de nuances d’azur, découvrez les tissages rifains et rejoignez la fraîcheur de la source Ras el-Maa.',
          es: 'Pasea por las famosas escaleras pintadas de azul cobalto, descubre mantas de lana bereber y acércate al fresco manantial de montaña Ras el-Maa, donde se reúnen los vecinos.',
        },
        badge: { en: 'Pure Magic', fr: 'Magie Pure', es: 'Pura magia' },
      },
      {
        time: '04:30 PM',
        title: {
          en: 'Relaxed Return Journey to Fez',
          fr: 'Retour Confortable vers Fès',
          es: 'Regreso tranquilo a Fez',
        },
        description: {
          en: 'Relax in your private vehicle during the comfortable drive back, arriving at your Fez accommodation around 7:30 PM.',
          fr: 'Trajet retour détendu en véhicule privé, arrivée à votre hébergement à Fès vers 19h30.',
          es: 'Relájate en tu vehículo privado durante el cómodo regreso, con llegada a tu alojamiento en Fez hacia las 19:30.',
        },
        badge: { en: 'Comfort Return', fr: 'Retour Confort', es: 'Regreso cómodo' },
      },
    ],
    included: {
      en: [
        'Modern air-conditioned private vehicle exclusively for your group',
        'Professional, punctual, licensed English/French-speaking private driver',
        'Door-to-door pickup & drop-off directly at your Fez Riad or hotel',
        'All fuel, highway tolls, vehicle parking fees, and road taxes',
        'Full freedom of schedule: stop for photos, tea, and viewpoints whenever you wish',
      ],
      fr: [
        'Véhicule privé récent climatisé exclusivement pour votre groupe',
        'Chauffeur professionnel privé agréé parlant français et anglais',
        'Prise en charge et retour porte-à-porte à votre Riad ou hôtel à Fès',
        'Carburant, péages d’autoroute et frais de stationnement inclus',
        'Liberté totale : arrêts photos et pauses café à votre demande',
      ],
      es: [
        'Vehículo privado moderno con aire acondicionado, exclusivo para tu grupo',
        'Conductor privado profesional, puntual y acreditado que habla inglés y francés',
        'Recogida y regreso puerta a puerta en tu riad u hotel de Fez',
        'Combustible, peajes, aparcamiento e impuestos de circulación incluidos',
        'Horario libre: paradas para fotos, té y miradores cuando queráis',
      ],
    },
    excluded: {
      en: ['Lunch & personal beverages in Chefchaouen', 'Local town guide (optional add-on ~250 MAD)', 'Driver tip'],
      fr: ['Déjeuner et boissons à Chefchaouen', 'Guide local de ville (optionnel ~250 MAD)', 'Pourboire chauffeur'],
      es: ['Almuerzo y bebidas en Chefchaouen', 'Guía local de la ciudad (opcional ~250 MAD)', 'Propina para el conductor'],
    },
    whatToBring: {
      en: ['Comfortable walking footwear for hilly cobblestones', 'Camera & charged power bank', 'Light jacket for mountain breezes', 'Cash in MAD'],
      fr: ['Chaussures confortables pour les ruelles en pente', 'Appareil photo & batterie', 'Veste légère', 'Espèces en MAD'],
      es: ['Calzado cómodo para las calles empedradas en cuesta', 'Cámara y batería externa cargada', 'Chaqueta ligera para la brisa de montaña', 'Efectivo en MAD'],
    },
    meetingPointDetails: {
      en: 'Door-to-door pickup at any Riad, hotel, or private villa in Fez at 08:00 AM.',
      fr: 'Prise en charge directement à votre hébergement à Fès à 08h00.',
      es: 'Recogida puerta a puerta en cualquier riad, hotel o villa privada de Fez a las 08:00.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before pickup.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la recogida.',
    },
    suitableFor: {
      en: ['Couples', 'Families', 'Photographers & Instagrammers', 'Small Groups of Friends'],
      fr: ['Couples', 'Familles', 'Photographes', 'Petits groupes d’amis'],
      es: ['Parejas', 'Familias', 'Fotógrafos y aficionados a Instagram', 'Pequeños grupos de amigos'],
    },
    reviews: [
      {
        author: 'Liam & Chloe Peterson',
        location: 'Melbourne, Australia',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'Our driver was so courteous, the car was spotless, and having our own private schedule meant we could wander the blue alleys at our leisure without any tour bus rush. Superb service!',
          fr: 'Chauffeur prévenant, véhicule impeccable, et aucune contrainte horaire de bus. Un service parfait.',
          es: 'El conductor fue muy atento, el coche estaba impecable y tener nuestro propio horario nos permitió recorrer las callejuelas azules sin las prisas de los autobuses turísticos. ¡Un servicio excelente!',
        },
      },
    ],
  },

  // ===================== 5. DAY TRIP: MEKNES & VOLUBILIS =====================
  'daytrip-meknes': {
    galleryImages: [
      '/images/daytrip-meknes/volubilis-mosaic.webp',
      '/images/daytrip-meknes/moulay-idriss.webp',
      '/images/daytrip-meknes/bab-mansour.webp',
      '/images/daytrip-meknes/historic-doorway.webp',
      '/images/daytrip-meknes/city-walls.webp',
    ],
    itinerary: [
      {
        time: '',
        title: {
          en: 'Volubilis',
          fr: 'Volubilis',
          es: 'Volubilis',
        },
        description: {
          en: 'Walk among the remains of the ancient Roman city, its old streets and buildings, and the mosaics that have survived for centuries.',
          fr: 'Marchez parmi les vestiges de la cité romaine, ses anciennes rues, ses bâtiments et les mosaïques qui ont traversé les siècles.',
          es: 'Camina entre los restos de la antigua ciudad romana, sus calles y edificios, y los mosaicos que han sobrevivido durante siglos.',
        },
        badge: { en: 'Roman Heritage', fr: 'Antiquité Romaine', es: 'Patrimonio romano' },
      },
      {
        time: '',
        title: {
          en: 'Moulay Idriss Zerhoun',
          fr: 'Moulay Idriss Zerhoun',
          es: 'Moulay Idriss Zerhoun',
        },
        description: {
          en: 'A small hillside pilgrimage town. Walk part of it, look at the views, and see its link to the early history of Morocco.',
          fr: 'Une petite ville sainte sur les collines. Parcourez-en une partie, profitez des vues et découvrez son lien avec les débuts de l’histoire du Maroc.',
          es: 'Una pequeña localidad de peregrinación sobre las colinas. Recorre parte del pueblo, disfruta de las vistas y descubre su vínculo con los comienzos de la historia de Marruecos.',
        },
        badge: { en: 'Holy Town', fr: 'Cité Sainte', es: 'Ciudad santa' },
      },
      {
        time: '',
        title: {
          en: 'Meknes: Bab Mansour and the old medina',
          fr: 'Meknès : Bab Mansour et l’ancienne médina',
          es: 'Meknes: Bab Mansour y la antigua medina',
        },
        description: {
          en: 'Walk around Bab Mansour, the old medina, historic walls and traditional streets. If the sites are open, there is also time for more of Meknes from the period of Sultan Moulay Ismail.',
          fr: 'Faites le tour de Bab Mansour, de l’ancienne médina, des remparts et des rues traditionnelles. Si les sites sont ouverts, il reste aussi du temps pour d’autres lieux de Meknès liés à l’époque du sultan Moulay Ismaïl.',
          es: 'Pasea por Bab Mansour, la antigua medina, las murallas históricas y las calles tradicionales. Si los lugares están abiertos, también habrá tiempo para conocer otros rincones de Meknes vinculados a la época del sultán Moulay Ismail.',
        },
        badge: { en: 'Imperial Capital', fr: 'Capitale Impériale', es: 'Capital imperial' },
      },
    ],
    included: {
      en: [
        'Private comfortable vehicle with experienced professional driver',
        'Door-to-door hotel/riad pickup and drop-off in Fez',
        'All transport costs, tolls, parking, and vehicle fuel',
        'Flexible schedule tailored to your interests in archaeology and photography',
      ],
      fr: [
        'Véhicule privé confortable avec chauffeur professionnel expérimenté',
        'Prise en charge et retour à votre hébergement à Fès',
        'Tous frais de carburant, péages et parkings',
        'Programme personnalisable selon vos préférences historiques',
      ],
      es: [
        'Vehículo privado cómodo con conductor profesional experimentado',
        'Recogida y regreso puerta a puerta en tu hotel o riad de Fez',
        'Todos los gastos de transporte, peajes, aparcamiento y combustible',
        'Horario flexible adaptado a tus intereses en arqueología y fotografía',
      ],
    },
    excluded: {
      en: ['Volubilis entrance ticket (~70 MAD)', 'Local site guide at Volubilis (optional ~200 MAD)', 'Lunch'],
      fr: ['Billet d’entrée à Volubilis (~70 MAD)', 'Guide officiel à Volubilis (optionnel ~200 MAD)', 'Déjeuner'],
      es: ['Entrada a Volubilis (~70 MAD)', 'Guía local en Volubilis (opcional ~200 MAD)', 'Almuerzo'],
    },
    whatToBring: {
      en: ['Sun hat and sunglasses (open archaeological ruins)', 'Comfortable walking sneakers', 'Camera', 'Cash in MAD'],
      fr: ['Chapeau et lunettes de soleil', 'Chaussures de marche', 'Appareil photo', 'Dirhams en espèces'],
      es: ['Sombrero y gafas de sol (yacimiento al aire libre)', 'Zapatillas cómodas para caminar', 'Cámara', 'Efectivo en MAD'],
    },
    meetingPointDetails: {
      en: 'Doorstep pickup at your Fez accommodation at 9:00 AM.',
      fr: 'Prise en charge à votre hôtel ou riad à 9h00.',
      es: 'Recogida en la puerta de tu alojamiento de Fez a las 9:00.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to departure.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['History & Archaeology Lovers', 'Couples', 'Families', 'Curious Explorers'],
      fr: ['Passionnés d’archéologie', 'Couples', 'Familles', 'Curieux d’histoire'],
      es: ['Amantes de la historia y la arqueología', 'Parejas', 'Familias', 'Exploradores curiosos'],
    },
    reviews: [
      {
        author: 'Prof. Julian Weber',
        location: 'Munich, Germany',
        rating: 5,
        date: 'October 2026',
        comment: {
          en: 'The Roman mosaics at Volubilis with the backdrop of the Zerhoun hills are breathtaking. Our driver made the whole day seamless and relaxing. Highly recommended!',
          fr: 'Les mosaïques de Volubilis avec les collines de Zerhoun en toile de fond sont spectaculaires.',
          es: 'Los mosaicos romanos de Volubilis, con las colinas de Zerhoun al fondo, son impresionantes. Nuestro conductor hizo que todo el día resultara cómodo y relajado. ¡Muy recomendable!',
        },
      },
    ],
  },

  // ===================== 6. DAY TRIP: IFRANE & MIDDLE ATLAS =====================
  'daytrip-ifrane': {
    galleryImages: [
      '/images/daytrip-ifrane/stone-lion.webp',
      '/images/daytrip-ifrane/mountain-countryside.webp',
      '/images/daytrip-ifrane/macaques.webp',
    ],
    itinerary: [
      {
        time: '',
        title: {
          en: 'From Fez into the mountains',
          fr: 'De Fès vers les montagnes',
          es: 'De Fez a las montañas',
        },
        description: {
          en: 'The road leaves the city for a greener, cooler landscape, then reaches Ifrane, with its distinctive architecture, clean streets and green spaces.',
          fr: 'La route quitte la ville pour un paysage plus vert et plus frais, puis arrive à Ifrane, avec son architecture particulière, ses rues propres et ses espaces verts.',
          es: 'La carretera deja atrás la ciudad para adentrarse en un paisaje más verde y fresco, hasta llegar a Ifrane, con su arquitectura singular, calles limpias y espacios verdes.',
        },
        badge: { en: 'Mountain Road', fr: 'Route de montagne', es: 'Carretera de montaña' },
      },
      {
        time: '',
        title: {
          en: 'Ifrane and the stone lion',
          fr: 'Ifrane et le lion de pierre',
          es: 'Ifrane y el león de piedra',
        },
        description: {
          en: 'Walk the central areas and see the stone lion statue, one of the symbols associated with the city.',
          fr: 'Promenez-vous dans les quartiers centraux et voyez la statue du lion de pierre, l’un des symboles associés à la ville.',
          es: 'Pasea por el centro y contempla la estatua del león de piedra, uno de los símbolos de la ciudad.',
        },
        badge: { en: 'Ifrane', fr: 'Ifrane', es: 'Ifrane' },
      },
      {
        time: '',
        title: {
          en: 'Scenic stops along the way',
          fr: 'Arrêts selon la route',
          es: 'Paradas panorámicas por el camino',
        },
        description: {
          en: 'Forests, mountains and countryside. Stops, photographs and short walks depend on the season, the weather and the road. The driver stays flexible, and a local guide can join you if you want one.',
          fr: 'Forêts, montagnes et campagne. Les arrêts, les photos et les courtes marches dépendent de la saison, du temps et de la route. Le chauffeur reste flexible, et un guide local peut vous accompagner si vous le souhaitez.',
          es: 'Bosques, montañas y paisajes rurales. Las paradas, las fotos y los paseos cortos dependen de la estación, el tiempo y la carretera. El conductor se adapta, y puede acompañaros un guía local si lo deseáis.',
        },
        badge: { en: 'Flexible', fr: 'Flexible', es: 'Flexible' },
      },
    ],
    included: {
      en: [
        'Private vehicle with air-conditioning and professional driver',
        'Riad/hotel pickup & drop-off in Fez',
        'Scenic stops along the way, when the season and the road allow',
        'All vehicle operating expenses, fuel, and tolls',
      ],
      fr: [
        'Véhicule privé climatisé avec chauffeur professionnel',
        'Prise en charge et retour à votre hébergement à Fès',
        'Arrêts sur la route, selon la saison et l’état des routes',
        'Carburant, péages et parkings inclus',
      ],
      es: [
        'Vehículo privado con aire acondicionado y conductor profesional',
        'Recogida y regreso en tu riad u hotel de Fez',
        'Paradas panorámicas por el camino, cuando lo permitan la estación y la carretera',
        'Todos los gastos del vehículo, combustible y peajes',
      ],
    },
    excluded: {
      en: ['Lunch at local mountain restaurant', 'Personal shopping', 'Driver tip'],
      fr: ['Déjeuner en auberge de montagne', 'Achats personnels', 'Pourboire chauffeur'],
      es: ['Almuerzo en un restaurante de montaña', 'Compras personales', 'Propina para el conductor'],
    },
    whatToBring: {
      en: ['Comfortable walking shoes', 'Light sweater or jacket (cooler mountain air)', 'Camera'],
      fr: ['Chaussures de marche', 'Gilet ou veste (air frais en altitude)', 'Appareil photo'],
      es: ['Calzado cómodo para caminar', 'Jersey o chaqueta ligera (el aire de montaña es más fresco)', 'Cámara'],
    },
    meetingPointDetails: {
      en: 'Door-to-door pickup in Fez at 09:00 AM.',
      fr: 'Prise en charge à votre hôtel à Fès à 09h00.',
      es: 'Recogida puerta a puerta en Fez a las 09:00.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before pickup.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['Families with Children', 'Nature Enthusiasts', 'Couples', 'Mountain Air Seekers'],
      fr: ['Familles avec enfants', 'Amoureux de la nature', 'Couples', 'En quête de grand air'],
      es: ['Familias con niños', 'Amantes de la naturaleza', 'Parejas', 'Quienes buscan aire de montaña'],
    },
    reviews: [
      {
        author: 'The Gallagher Family',
        location: 'Dublin, Ireland',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'A relaxed day in the mountains, with time to stop where we wanted. Ifrane felt very different from Fez.',
          fr: 'Une journée détendue dans les montagnes, avec le temps de s’arrêter où nous voulions. Ifrane est très différente de Fès.',
          es: 'Un día tranquilo en las montañas, con tiempo para parar donde queríamos. Ifrane nos pareció muy diferente de Fez.',
        },
      },
    ],
  },

  // ===================== 7. DAY TRIP: CUSTOM PRIVATE TRIP =====================
  'daytrip-custom': {
    galleryImages: [
      '/images/daytrip-custom/group-viewpoint.webp',
    ],
    itinerary: [
      {
        time: 'Flexible',
        title: {
          en: 'Tailored Route Co-Designed with You',
          fr: 'Circuit Sur Mesure Conçu avec Vous',
          es: 'Ruta a medida diseñada contigo',
        },
        description: {
          en: 'Tell us the places you want to see, when to leave, and how long to stay at each stop. We arrange the day from Fez around that.',
          fr: 'Dites-nous les lieux, l’heure de départ et le temps à chaque arrêt. Nous organisons la journée au départ de Fès autour de cela.',
          es: 'Dinos qué lugares quieres conocer, a qué hora salir y cuánto tiempo pasar en cada parada. Organizamos la jornada desde Fez según tus preferencias.',
        },
        badge: { en: 'Bespoke', fr: 'Sur Mesure', es: 'A medida' },
      },
    ],
    included: {
      en: [
        'Dedicated private vehicle and professional driver for the entire day',
        'Custom route planning and personal coordination with local guides',
        'Total flexibility of departure time and stops along the way',
      ],
      fr: [
        'Véhicule privé et chauffeur dédié pour toute la journée',
        'Création d’itinéraire personnalisé avec notre équipe',
        'Flexibilité absolue des horaires et des arrêts',
      ],
      es: [
        'Vehículo privado y conductor profesional a tu disposición todo el día',
        'Planificación de la ruta a medida y coordinación personal con guías locales',
        'Flexibilidad total en la hora de salida y las paradas',
      ],
    },
    excluded: {
      en: ['Personal expenses & meals', 'Optional monument entrance fees', 'Gratuities'],
      fr: ['Dépenses personnelles & repas', 'Entrées aux sites optionnels', 'Pourboires'],
      es: ['Gastos personales y comidas', 'Entradas a monumentos opcionales', 'Propinas'],
    },
    whatToBring: {
      en: ['Passport or ID copy', 'Comfortable footwear', 'Camera', 'Cash in MAD'],
      fr: ['Pièce d’identité', 'Chaussures confortables', 'Appareil photo', 'Espèces'],
      es: ['Copia del pasaporte o documento de identidad', 'Calzado cómodo', 'Cámara', 'Efectivo en MAD'],
    },
    meetingPointDetails: {
      en: 'Any location or accommodation in Fez.',
      fr: 'Tout hébergement à Fès.',
      es: 'Cualquier lugar o alojamiento de Fez.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before tour departure.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['VIP Travelers', 'Families with Custom Needs', 'Special Celebrations', 'Photographers'],
      fr: ['Voyageurs VIP', 'Familles aux besoins spécifiques', 'Célébrations', 'Photographes'],
      es: ['Viajeros VIP', 'Familias con necesidades específicas', 'Celebraciones especiales', 'Fotógrafos'],
    },
    reviews: [
      {
        author: 'Daniel & Sophia Vance',
        location: 'Toronto, Canada',
        rating: 5,
        date: 'August 2026',
        comment: {
          en: 'Med and his drivers created a completely custom trip for us to the Middle Atlas and cherry orchards. Super professional, responsive, and trustworthy.',
          fr: 'Med nous a concocté un circuit sur mesure absolument parfait. Professionnalisme et réactivité remarquables.',
          es: 'Med y sus conductores nos organizaron una excursión totalmente a medida al Atlas Medio y a los campos de cerezos. Muy profesionales, atentos y de confianza.',
        },
      },
    ],
  },

  // ===================== 8. FOOD TOURS: STREET FOOD TASTING WALK =====================
  'food-tasting-walk': {
    galleryImages: [
      '/images/real/food_medina_walk.jpg',
      '/images/real/food_tagine_table.jpg',
      '/images/real/food_feast_board.jpg',
      '/images/real/food_couscous_plate.jpg',
      '/images/real/food_spice_souk.jpg',
    ],
    itinerary: [
      {
        time: '10:00 AM',
        title: {
          en: 'Stop 1: Hot Golden Harcha & Baghrir Honey Pancakes',
          fr: 'Étape 1 : Harcha Dorée & Crêpes Baghrir au Miel',
          es: 'Parada 1: harcha dorada caliente y tortitas baghrir con miel',
        },
        description: {
          en: 'Begin at an authentic neighborhood griddle tasting piping hot semolina harcha spread with goat cheese, wild mountain honey, and thousand-hole baghrir.',
          fr: 'Démarrez devant une plaque traditionnelle pour goûter la galette de semoule harcha fumante avec miel de montagne et crêpes baghrir.',
          es: 'Empieza junto a una plancha tradicional del barrio, probando harcha de sémola recién hecha con queso de cabra y miel silvestre de montaña, y baghrir de mil agujeros.',
        },
        badge: { en: 'Morning Bite', fr: 'Douceur Matinale', es: 'Bocado de la mañana' },
      },
      {
        time: '11:00 AM',
        title: {
          en: 'Stop 2: Steaming Bissara with Extra Virgin Olive Oil & Cumin',
          fr: 'Étape 2 : Bissara Fumante à l’Huile d’Olive & Cumin',
          es: 'Parada 2: bissara caliente con aceite de oliva virgen extra y comino',
        },
        description: {
          en: 'Sip traditional slow-simmered fava bean soup directly from an earthenware bowl, drizzled with local Saïss olive oil, freshly ground cumin, and warm flatbread.',
          fr: 'Dégustez dans une échoppe populaire la soupe de fèves onctueuse, parfumée d’huile d’olive du terroir et de cumin moulu.',
          es: 'Prueba una sopa tradicional de habas cocinada a fuego lento, servida en un cuenco de barro con aceite de oliva de Saïss, comino recién molido y pan plano caliente.',
        },
        badge: { en: 'Authentic Soul Food', fr: 'Plat Populaire', es: 'Cocina popular auténtica' },
      },
      {
        time: '12:00 PM',
        title: {
          en: 'Stop 3: Ferran l-Houma (Wood-Fired Communal Oven)',
          fr: 'Étape 3 : Le Ferran l-Houma (Fournil Traditionnel du Quartier)',
          es: 'Parada 3: Ferran l-Houma (horno comunitario de leña)',
        },
        description: {
          en: 'Step into the underground stone oven where families bring their kneaded dough. Smell fresh loaves baked over scented cedar wood embers.',
          fr: 'Pénétrez dans le fournil de quartier où les familles apportent leur pain pétri à la main, cuit au feu de bois de cèdre.',
          es: 'Entra en el horno de piedra subterráneo al que las familias llevan su masa. Respira el aroma del pan recién horneado sobre brasas de madera de cedro.',
        },
        badge: { en: 'Community Hearth', fr: 'Cœur du Quartier', es: 'El horno del barrio' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Stop 4: Crispy Fresh Sfenj Fried Before Your Eyes',
          fr: 'Étape 4 : Sfenj Croustillants Frits sous vos Yeux',
          es: 'Parada 4: sfenj crujientes fritos ante tus ojos',
        },
        description: {
          en: 'Watch the sfenj master stretch airy dough with wet fingertips, fry golden rings in bubbling oil, and string them with fresh palm leaves.',
          fr: 'Admirez le tour de main du maître beignatier et croquez dans un sfenj doré et croustillant tout juste sorti du bain d’huile.',
          es: 'Observa al maestro del sfenj estirar la masa ligera con los dedos mojados, freír los aros hasta dorarlos y ensartarlos en hojas de palma frescas.',
        },
        badge: { en: 'Fresh & Crispy', fr: 'Tout Chaud', es: 'Recién hechos y crujientes' },
      },
      {
        time: '01:45 PM',
        title: {
          en: 'Stop 5: Mint Tea Ceremony with Chebakia & Gazelle Horns',
          fr: 'Étape 5 : Cérémonie du Thé à la Menthe & Pâtisseries Fassies',
          es: 'Parada 5: ceremonia del té de menta con chebakia y cuernos de gacela',
        },
        description: {
          en: 'Conclude with a high-poured traditional mint tea ritual accompanied by almond gazelle horns (kaab el-ghzal) and honeyed chebakia.',
          fr: 'Terminez avec le rituel du thé à la menthe servi de haut avec cornes de gazelle aux amandes et chebakia parfumée à la fleur d’oranger.',
          es: 'Termina con el ritual del té de menta servido desde lo alto, acompañado de cuernos de gacela de almendra (kaab el-ghzal) y chebakia bañada en miel.',
        },
        badge: { en: 'Sweet Finale', fr: 'Douceur Finale', es: 'Final dulce' },
      },
    ],
    included: {
      en: [
        'Expert native Fez food guide sharing culinary history and family recipes',
        'All food tastings, street snacks, pastries, and drinks included (enough for a hearty meal)',
        '100% Private tour exclusively for you and your travel companions',
        'Visits to authentic neighborhood food stalls and communal wood ovens',
        'Customized adjustments for dietary restrictions (vegetarians welcome)',
      ],
      fr: [
        'Guide culinaire natif de Fès passionné par les traditions familiales',
        'Toutes les dégustations salées et sucrées incluses (équivalent à un repas complet)',
        'Visite 100% privée réservée exclusivement à votre groupe',
        'Accès aux ateliers secrets et au fournil de quartier traditionnel',
        'Adaptations possibles selon vos régimes alimentaires (végétariens bienvenus)',
      ],
      es: [
        'Guía gastronómico experto, nacido en Fez, que comparte historia culinaria y recetas familiares',
        'Todas las degustaciones, bocados callejeros, dulces y bebidas incluidos (suficientes para una comida completa)',
        'Visita 100% privada, exclusiva para ti y tus acompañantes',
        'Visitas a puestos de comida del barrio y hornos comunitarios de leña',
        'Adaptaciones a restricciones alimentarias (los vegetarianos son bienvenidos)',
      ],
    },
    excluded: {
      en: ['Alcoholic beverages (none served in the Medina stalls)', 'Personal take-home shopping of spices or sweets', 'Guide tip'],
      fr: ['Boissons alcoolisées', 'Achats d’épices ou douceurs à emporter', 'Pourboire guide'],
      es: ['Bebidas alcohólicas (no se sirven en los puestos de la medina)', 'Compras de especias o dulces para llevar', 'Propina para el guía'],
    },
    whatToBring: {
      en: ['A very healthy appetite!', 'Comfortable walking shoes', 'Hand wipes or sanitizing gel', 'Camera'],
      fr: ['Un solide appétit !', 'Chaussures de marche', 'Lingettes', 'Appareil photo'],
      es: ['¡Mucho apetito!', 'Calzado cómodo para caminar', 'Toallitas o gel desinfectante', 'Cámara'],
    },
    meetingPointDetails: {
      en: 'Bab Boujloud (Blue Gate) or pickup at your Medina Riad at 10:00 AM.',
      fr: 'Bab Boujloud ou départ depuis votre Riad à 10h00.',
      es: 'Bab Boujloud (Puerta Azul) o recogida en tu riad de la medina a las 10:00.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to tour start.',
      fr: 'Annulation gratuite jusqu’à 24 heures avant le début de la visite.',
      es: 'Cancelación gratuita hasta 24 horas antes del inicio de la visita.',
    },
    suitableFor: {
      en: ['Food Lovers & Curious Eaters', 'Couples', 'Families', 'Culture Enthusiasts'],
      fr: ['Amateurs de bonne chère', 'Couples', 'Familles', 'Passionnés de culture'],
      es: ['Amantes de la gastronomía y paladares curiosos', 'Parejas', 'Familias', 'Aficionados a la cultura'],
    },
    reviews: [
      {
        author: 'Chef Julien Laurent',
        location: 'Lyon, France',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'As a chef, this was the most genuine food experience I had in Morocco. No sanitized tourist restaurant, just raw, honest, delicious heritage food eaten where the locals eat. The hot sfenj and bissara were extraordinary!',
          fr: 'En tant que cuisinier, c’est la meilleure expérience culinaire de mon voyage. Une nourriture authentique, généreuse et pleine d’âme.',
          es: 'Como cocinero, fue la experiencia gastronómica más auténtica que tuve en Marruecos. Nada de restaurantes turísticos sin carácter: cocina tradicional de verdad, deliciosa, allí donde comen los vecinos. ¡El sfenj caliente y la bissara eran extraordinarios!',
        },
      },
    ],
  },

  // ===================== 9. FOOD TOURS: TRADITIONAL FASSI FEAST =====================
  'food-traditional-fassi': {
    galleryImages: [
      '/images/real/food_feast_board.jpg',
      '/images/real/food_tagine_table.jpg',
      '/images/real/food_couscous_plate.jpg',
      '/images/real/food_medina_walk.jpg',
      '/images/real/food_spice_souk.jpg',
    ],
    itinerary: [
      {
        time: '11:00 AM',
        title: {
          en: 'The History of Fassi Imperial Gastronomy',
          fr: 'Histoire de la Gastronomie Impériale Fassie',
          es: 'Historia de la gastronomía imperial de Fez',
        },
        description: {
          en: 'Introduction to Arab-Andalusian culinary crosscurrents, spice blending with Ras el Hanout, and the royal pastilla tradition.',
          fr: 'Introduction aux influences arabo-andalouses, composition du Ras el Hanout et secrets de la pastilla royale.',
          es: 'Introducción a las influencias culinarias araboandalusíes, las mezclas de especias Ras el Hanout y la tradición de la pastilla real.',
        },
        badge: { en: 'Culinary Heritage', fr: 'Héritage Culinaire', es: 'Patrimonio culinario' },
      },
      {
        time: '12:30 PM',
        title: {
          en: 'Royal Pastilla & Slow-Simmered Tajine Tasting',
          fr: 'Dégustation de Pastilla Royale & Tajines Mijotés',
          es: 'Degustación de pastilla real y tajines a fuego lento',
        },
        description: {
          en: 'Savor crisp golden pastilla dusted with cinnamon and sugar, followed by slow-cooked lamb with caramelized prunes, toasted almonds, and handmade flatbreads.',
          fr: 'Dégustation de pastilla croustillante à la cannelle suivie d’un tajine d’agneau fondant aux pruneaux caramélisés et amandes torréfiées.',
          es: 'Saborea una pastilla dorada y crujiente, espolvoreada con canela y azúcar, seguida de cordero a fuego lento con ciruelas caramelizadas, almendras tostadas y panes planos hechos a mano.',
        },
        badge: { en: 'Royal Feast', fr: 'Festin Royal', es: 'Banquete real' },
      },
      {
        time: '02:00 PM',
        title: {
          en: 'Tea Ceremony & Gazelle Horns (Kaab el-Ghzal)',
          fr: 'Cérémonie du Thé & Cornes de Gazelle',
          es: 'Ceremonia del té y cuernos de gacela (Kaab el-Ghzal)',
        },
        description: {
          en: 'End the feast with orange blossom infused almond pastries and authentic fresh mint tea.',
          fr: 'Clôture avec pâtisseries aux amandes et eau de fleur d’oranger, accompagnées du thé à la menthe.',
          es: 'Termina el banquete con dulces de almendra aromatizados con agua de azahar y auténtico té de menta fresca.',
        },
        badge: { en: 'Sweet Finish', fr: 'Douceur', es: 'Final dulce' },
      },
    ],
    included: {
      en: [
        'Full multi-course royal Moroccan meal (Pastilla, Tagines, Salads, Pastries, Drinks)',
        '100% Private dining experience in an authentic Medina Riad',
        'Expert commentary from a local food historian',
        'Traditional mint tea ritual',
      ],
      fr: [
        'Repas complet gastronomique d’exception (Pastilla, tajines, salades, pâtisseries, boissons)',
        'Expérience 100% privée dans un riad traditionnel de la médina',
        'Explications passionnantes d’un expert culinaire local',
        'Cérémonie traditionnelle du thé à la menthe',
      ],
      es: [
        'Comida marroquí completa de varios platos (pastilla, tajines, ensaladas, dulces y bebidas)',
        'Experiencia gastronómica 100% privada en un riad auténtico de la medina',
        'Explicaciones de un historiador gastronómico local',
        'Ritual tradicional del té de menta',
      ],
    },
    excluded: {
      en: ['Alcoholic beverages', 'Personal souvenir purchases', 'Staff gratuities'],
      fr: ['Boissons alcoolisées', 'Achats personnels', 'Pourboires'],
      es: ['Bebidas alcohólicas', 'Compras de recuerdos personales', 'Propinas para el personal'],
    },
    whatToBring: {
      en: ['Good appetite', 'Camera for beautiful food presentation photos'],
      fr: ['Bonne faim', 'Appareil photo pour les superbes présentations'],
      es: ['Buen apetito', 'Cámara para fotografiar la presentación de los platos'],
    },
    meetingPointDetails: {
      en: 'Doorstep pickup at your Riad or hotel in Fez at 11:00 AM.',
      fr: 'Prise en charge à votre riad à Fès à 11h00.',
      es: 'Recogida en la puerta de tu riad u hotel de Fez a las 11:00.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to experience.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['Couples', 'Food Connoisseurs', 'Families', 'Special Occasion Celebrations'],
      fr: ['Couples', 'Gastronomes', 'Familles', 'Célébrations'],
      es: ['Parejas', 'Entendidos en gastronomía', 'Familias', 'Celebraciones especiales'],
    },
    reviews: [
      {
        author: 'Guillaume & Claire Bernard',
        location: 'Paris, France',
        rating: 5,
        date: 'October 2026',
        comment: {
          en: 'The pastilla here is a work of art. Melt-in-your-mouth perfection with just the right touch of cinnamon. Best meal in our entire 2 weeks in Morocco!',
          fr: 'La pastilla est une œuvre d’art. Meilleur repas de nos 2 semaines au Maroc !',
          es: 'La pastilla de aquí es una obra de arte. Se deshace en la boca, con el toque justo de canela. ¡La mejor comida de nuestras dos semanas en Marruecos!',
        },
      },
    ],
  },

  // ===================== 10. FOOD TOURS: FOOD CULTURE & LOCAL LIFE =====================
  'food-culture-life': {
    galleryImages: [
      '/images/real/food_couscous_plate.jpg',
      '/images/real/food_medina_walk.jpg',
      '/images/real/food_tagine_table.jpg',
      '/images/real/food_feast_board.jpg',
      '/images/real/food_spice_souk.jpg',
    ],
    itinerary: [
      {
        time: '09:30 AM',
        title: {
          en: 'Communal Oven (Ferran l-Houma) & Bread Making',
          fr: 'Le Fournil de Quartier (Ferran) & Tradition du Pain',
          es: 'Horno comunitario (Ferran l-Houma) y elaboración del pan',
        },
        description: {
          en: 'Witness families and children delivering proofed bread dough to be baked on scented cedar wood embers. Learn the unique bread seals of neighborhood families.',
          fr: 'Découvrez la tradition vivante du pain cuit au feu de bois dans les vieux fournil souterrains de la médina.',
          es: 'Observa a familias y niños llevar la masa fermentada para hornearla sobre brasas de cedro. Descubre las marcas con las que cada familia del barrio identifica su pan.',
        },
        badge: { en: 'Living Tradition', fr: 'Tradition Vivante', es: 'Tradición viva' },
      },
      {
        time: '11:00 AM',
        title: {
          en: 'Sacred Friday Couscous Ritual & Seven Vegetables',
          fr: 'Le Rituel Sacré du Couscous du Vendredi & Sept Légumes',
          es: 'Ritual del cuscús del viernes y las siete verduras',
        },
        description: {
          en: 'Learn how couscous is hand-rolled from durum semolina, steamed three times in a couscoussier, and crowned with pumpkin, carrots, zucchini, turnips, cabbage, chickpeas, and sweet caramelized tfaya.',
          fr: 'Comprenez le savoir-faire ancestral du couscous roulé à la main, cuit à la vapeur trois fois et garni des 7 légumes et tfaya caramélisée.',
          es: 'Descubre cómo se trabaja a mano la sémola de trigo duro para hacer cuscús, se cuece al vapor tres veces en una cuscusera y se sirve con calabaza, zanahorias, calabacín, nabos, col, garbanzos y tfaya dulce caramelizada.',
        },
        badge: { en: 'Friday Heritage', fr: 'Couscous Rituel', es: 'Tradición del viernes' },
      },
    ],
    included: {
      en: [
        'Private guided walking tour through authentic residential quarters',
        'Exclusive access to historical working neighborhood ovens and mills',
        'Tasting of fresh warm bread, olives, and traditional mint tea',
        'Deep cultural storytelling on neighborhood solidarity and rituals',
      ],
      fr: [
        'Visite pédestre privée des ruelles résidentielles préservées',
        'Accès exclusif aux fournils et moulins traditionnels en activité',
        'Dégustation de pain chaud tout juste sorti du four et thé à la menthe',
        'Explications sur la vie sociale et la solidarité de quartier',
      ],
      es: [
        'Paseo privado guiado por barrios residenciales auténticos',
        'Acceso exclusivo a hornos y molinos históricos del barrio que siguen en funcionamiento',
        'Degustación de pan recién hecho, aceitunas y té de menta tradicional',
        'Relatos sobre la solidaridad vecinal y las costumbres del barrio',
      ],
    },
    excluded: {
      en: ['Personal grocery shopping', 'Guide tip'],
      fr: ['Achats personnels', 'Pourboire guide'],
      es: ['Compras personales de alimentos', 'Propina para el guía'],
    },
    whatToBring: {
      en: ['Comfortable walking shoes', 'Modest clothing for residential quarters', 'Camera'],
      fr: ['Chaussures confortables', 'Tenue décente pour les quartiers résidentiels', 'Appareil photo'],
      es: ['Calzado cómodo para caminar', 'Ropa discreta para los barrios residenciales', 'Cámara'],
    },
    meetingPointDetails: {
      en: 'Bab Boujloud or pickup at your Riad in Fez.',
      fr: 'Bab Boujloud ou départ de votre riad.',
      es: 'Bab Boujloud o recogida en tu riad de Fez.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours in advance.',
      fr: 'Annulation gratuite jusqu’à 24h avant.',
      es: 'Cancelación gratuita hasta 24 horas antes de la actividad.',
    },
    suitableFor: {
      en: ['Anthropology & Culture Seekers', 'Families', 'Slow Travel Enthusiasts'],
      fr: ['Amateurs de culture', 'Familles', 'Voyageurs curieux'],
      es: ['Interesados en la antropología y la cultura', 'Familias', 'Amantes de los viajes sin prisas'],
    },
    reviews: [
      {
        author: 'Elena & Matteo Rossi',
        location: 'Florence, Italy',
        rating: 5,
        date: 'September 2026',
        comment: {
          en: 'Entering the underground communal bakery and smelling the cedar wood was a sensory memory we will keep forever. The couscous story is so beautiful.',
          fr: 'Entrer dans le four à bois souterrain était un souvenir sensoriel inoubliable. L’histoire du couscous est magnifique.',
          es: 'Entrar en el horno comunitario subterráneo y oler la madera de cedro fue un recuerdo sensorial que guardaremos para siempre. La historia del cuscús es preciosa.',
        },
      },
    ],
  },

  'our-food-tours': {
    galleryImages: [
      '/images/food-tasting-walk/street-sandwich.webp',
      '/images/food-tasting-walk/medina-lane.webp',
      '/images/food-tasting-walk/wood-oven.webp',
      '/images/food-tasting-walk/pastries-tea.webp',
      '/images/food-tasting-walk/mint-tea.webp',
      '/images/food-tasting-walk/tasting-table.webp',
    ],
    itinerary: [
      {
        time: '',
        title: {
          en: 'Walk the food streets of the Medina',
          fr: 'Marcher dans les rues alimentaires de la médina',
          es: 'Pasea por las calles gastronómicas de la medina',
        },
        description: {
          en: 'Bakeries, food shops, spice sellers and small stalls. The Medina is part of the tasting, not a backdrop.',
          fr: 'Fours, boutiques, vendeurs d’épices et petits étals. La médina fait partie de la dégustation.',
          es: 'Panaderías, tiendas de comida, vendedores de especias y pequeños puestos. La medina forma parte de la degustación, no es un simple decorado.',
        },
        badge: { en: 'Medina', fr: 'Médina', es: 'Medina' },
      },
      {
        time: '',
        title: {
          en: 'Taste what is available that day',
          fr: 'Goûter ce qui est disponible ce jour-là',
          es: 'Prueba lo que haya disponible ese día',
        },
        description: {
          en: 'Sweet and savoury foods, tea and everyday specialities. The list is not fixed. Shops do not prepare the same things every day.',
          fr: 'Sucré, salé, thé et spécialités du quotidien. La liste n’est pas fixe. Les boutiques ne préparent pas la même chose chaque jour.',
          es: 'Bocados dulces y salados, té y especialidades cotidianas. La selección no es fija. Las tiendas no preparan lo mismo todos los días.',
        },
        badge: { en: 'Tastings', fr: 'Dégustations', es: 'Degustaciones' },
      },
      {
        time: '',
        title: {
          en: 'Ask, photograph, and stay longer',
          fr: 'Demander, photographier, rester plus longtemps',
          es: 'Pregunta, haz fotos y quédate más tiempo',
        },
        description: {
          en: 'The walk is private. There is time to talk with sellers and to understand how the food fits into everyday life in Fez.',
          fr: 'La balade est privée. Il y a le temps de parler avec les vendeurs et de comprendre la place de la cuisine dans la vie de Fès.',
          es: 'El paseo es privado. Hay tiempo para hablar con los vendedores y comprender el lugar de la comida en la vida cotidiana de Fez.',
        },
        badge: { en: 'Flexible', fr: 'Flexible', es: 'Flexible' },
      },
    ],
    included: {
      en: [
        'Private walk for your group',
        'Tastings of foods available that day',
        'Explanations of what you are eating and how it fits into life in Fez',
      ],
      fr: [
        'Balade privée pour votre groupe',
        'Dégustations de ce qui est disponible ce jour-là',
        'Explications sur ce que vous mangez et sa place dans la vie de Fès',
      ],
      es: [
        'Paseo privado para vuestro grupo',
        'Degustaciones de los alimentos disponibles ese día',
        'Explicaciones sobre lo que coméis y su lugar en la vida de Fez',
      ],
    },
    excluded: {
      en: ['Personal shopping', 'Tips'],
      fr: ['Achats personnels', 'Pourboires'],
      es: ['Compras personales', 'Propinas'],
    },
    whatToBring: {
      en: ['An appetite', 'Comfortable walking shoes'],
      fr: ['De l’appétit', 'Chaussures de marche confortables'],
      es: ['Apetito', 'Calzado cómodo para caminar'],
    },
    meetingPointDetails: {
      en: 'Bab Boujloud or Bab Rcif.',
      fr: 'Bab Boujloud ou Bab Rcif.',
      es: 'Bab Boujloud o Bab Rcif.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before the walk.',
      fr: 'Annulation gratuite jusqu’à 24 heures avant la balade.',
      es: 'Cancelación gratuita hasta 24 horas antes del paseo.',
    },
    suitableFor: {
      en: ['Curious eaters', 'Couples', 'Families', 'Private groups'],
      fr: ['Curieux de cuisine', 'Couples', 'Familles', 'Groupes privés'],
      es: ['Paladares curiosos', 'Parejas', 'Familias', 'Grupos privados'],
    },
    reviews: [],
  },
};
