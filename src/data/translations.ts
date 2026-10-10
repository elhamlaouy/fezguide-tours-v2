import { Language, PageId, SectionPillar, TeamMember, FaqItem, BlogPost, CustomPage, SiteSettings } from '../types';

export const UI_TEXT = {
  nav: {
    home: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
    fez: { en: 'Fez', fr: 'Fès', ar: 'فاس' },
    dayTrips: { en: 'Day Trips', fr: 'Excursions', ar: 'رحلات يومية' },
    foodTours: { en: 'Food Tours', fr: 'Tours Culinaires', ar: 'جولات الأكل والتذوق' },
    travelTips: { en: 'Travel Tips', fr: 'Conseils Voyage', ar: 'نصائح السفر' },
    about: { en: 'About Us', fr: 'À Propos', ar: 'من نحن' },
    faq: { en: 'FAQ', fr: 'FAQ', ar: 'الأسئلة الشائعة' },
    bookTour: { en: 'Book an Experience', fr: 'Réserver une Expérience', ar: 'احجز تجربة' },
  },
  common: {
    viewMore: { en: 'View More', fr: 'En Savoir Plus', ar: 'عرض المزيد' },
    explore: { en: 'Explore Details', fr: 'Explorer en détail', ar: 'استكشف التفاصيل' },
    bookNow: { en: 'Book This Tour', fr: 'Réserver ce Tour', ar: 'احجز هذه الجولة' },
    close: { en: 'Close', fr: 'Fermer', ar: 'إغلاق' },
    whatsappChat: { en: 'Talk to Someone Who Knows Fez', fr: 'Parlez à un local de Fès', ar: 'تحدث مع ابن فاس مباشرة' },
    duration: { en: 'Duration', fr: 'Durée', ar: 'المدة' },
    groupSize: { en: 'Experience Format', fr: 'Format', ar: 'نوع التجربة' },
    departure: { en: 'Meeting / Departure', fr: 'Départ / Rendez-vous', ar: 'نقطة الانطلاق' },
    licensedGuides: { en: 'Local Guides & Drivers', fr: 'Guides Locaux & Chauffeurs', ar: 'مرشدون وسائقون محليون' },
    highlights: { en: 'What You Discover', fr: 'Ce que vous découvrirez', ar: 'ما ستكتشفه' },
    included: { en: 'Included & Formats', fr: 'Inclusions & Formats', ar: 'ما تشمله التجربة' },
    fromPrice: { en: 'From', fr: 'À partir de', ar: 'ابتداءً من' },
    allDepartments: { en: 'Explore Our City', fr: 'Découvrir la Ville', ar: 'استكشف مدينتنا' },
  },
  hero: {
    tagline: {
      en: 'Fez Guide Tours — Discover the City Through Local Eyes',
      fr: 'Fez Guide Tours — Découvrez la Ville à Travers des Yeux Locaux',
      ar: 'فاس جايد تورز — اكتشف فاس بعيون أبنائها المحليين',
    },
    title: {
      en: 'Discover Fez in a Simple, Comfortable and Personal Way',
      fr: 'Découvrez Fès de Manière Simple, Confortable et Personnelle',
      ar: 'اكتشف فاس بطريقة بسيطة، مريحة وتجربة خاصة بك',
    },
    subtitle: {
      en: 'We know the streets of the Medina, the local food, living traditions and everyday life. Private walking tours, food tastings, and relaxed day trips beyond the city.',
      fr: 'Nous connaissons les ruelles de la Médina, les saveurs locales, les traditions vivantes et le quotidien. Balades guidées privées, dégustations et excursions.',
      ar: 'نعرف دروب فاس البالي، مأكولاتنا الشعبية الأصيلة، تقاليدنا وتفاصيل الحياة اليومية. جولات خاصة مشياً على الأقدام، رحلات تذوق، ورحلات يومية مريحة.',
    },
    ctaExplore: {
      en: 'Explore Medina Experiences',
      fr: 'Explorer la Médina',
      ar: 'استكشف جولات فاس',
    },
    ctaDayTrips: {
      en: 'Day Trips Beyond Fez',
      fr: 'Excursions d’un Jour',
      ar: 'رحلات يومية خاصة',
    },
  },
  homeQuickNav: {
    title: {
      en: 'Welcome to Fez. See the City Through Local Eyes.',
      fr: 'Bienvenue à Fès. Découvrez la ville à travers des yeux locaux.',
      ar: 'مرحباً بكم في فاس. اكتشفوا سحر المدينة بعيون أبنائها.',
    },
    subtitle: {
      en: 'Choose an experience designed around comfort, local knowledge, and genuine Moroccan hospitality.',
      fr: 'Choisissez une expérience pensée pour votre confort, votre curiosité et l’accueil marocain.',
      ar: 'اختر تجربة سياحية مصممة لتضمن لك الراحة والمعرفة والضيافة المغربية الأصيلة.',
    },
  },
  trustBar: {
    badge1: {
      title: { en: 'Local Knowledge', fr: 'Expertise Locale', ar: 'معرفة محلية عميقة' },
      desc: { en: 'Guides born and living in Fez', fr: 'Guides nés et vivants à Fès', ar: 'مرشدون من أبناء المدينة العتيقة' },
    },
    badge2: {
      title: { en: 'Private & Flexible', fr: 'Privé & Flexible', ar: 'خاص ومرن بالكامل' },
      desc: { en: 'For your group, at your own pace', fr: 'Pour votre groupe, à votre rythme', ar: 'لكم ولمجموعتكم بالوتيرة التي تناسبكم' },
    },
    badge3: {
      title: { en: 'Comfortable Vehicles', fr: 'Véhicules Confortables', ar: 'سيارات مريحة ومكيفة' },
      desc: { en: 'Trusted drivers for scenic day trips', fr: 'Chauffeurs de confiance pour excursions', ar: 'سائقون موثوقون لرحلات اليوم الواحد' },
    },
    badge4: {
      title: { en: 'Living Heritage', fr: 'Patrimoine Vivant', ar: 'تراث حي أصيل' },
      desc: { en: 'Craftsmen, food, and daily rhythm', fr: 'Artisans, cuisine et vie quotidienne', ar: 'حرف تقليدية، أطعمة، ونبض الحياة' },
    },
  },
  footer: {
    aboutText: {
      en: 'Fez Guide Tours is a small local team based in Fez dedicated to sharing our city in a simple, comfortable and personal way. Discover Fez through local eyes.',
      fr: 'Fez Guide Tours est une équipe locale basée à Fès dédiée à partager notre ville de manière simple, confortable et authentique. Découvrez la ville à travers des yeux locaux.',
      ar: 'فاس جايد تورز فريق محلي مقيم في فاس نسعى لمشاركتكم روح مدينتنا وتاريخها العريق بأسلوب بسيط، مريح وشخصي.',
    },
    quickLinks: { en: 'Quick Navigation', fr: 'Navigation Rapide', ar: 'روابط سريعة' },
    contactUs: { en: 'Direct Contact', fr: 'Contact Direct', ar: 'تواصل مباشر' },
    contactTitle: { en: 'Direct Contact & Inquiries', fr: 'Contact & Réservations', ar: 'تواصل مباشر واستفسارات' },
    address: {
      en: 'Bab Boujloud, Medina of Fez, Morocco',
      fr: 'Bab Boujloud, Médina de Fès, Maroc',
      ar: 'باب بوجلود، فاس البالي، المغرب',
    },
    trustBadges: {
      en: 'Local Native Hosts & Certified Medina Guides',
      fr: 'Hôtes Natifs & Guides Locaux Agréés',
      ar: 'فريق محلي من أبناء فاس ومرشدون معتمدون',
    },
    rights: {
      en: 'All rights reserved. FezGuideTours — Discover Fez Through Local Eyes.',
      fr: 'Tous droits réservés. FezGuideTours — Découvrez Fès à travers des yeux locaux.',
      ar: 'جميع الحقوق محفوظة. فاس جايد تورز — اكتشف فاس بعيون أهلها.',
    },
    copyright: {
      en: '© 2026 FezGuideTours. All rights reserved. Welcome to Fez. See the city through local eyes.',
      fr: '© 2026 FezGuideTours. Tous droits réservés. Bienvenue à Fès. Découvrez la ville à travers des yeux locaux.',
      ar: '© 2026 فاس جايد تورز. جميع الحقوق محفوظة. مرحباً بكم في فاس. اكتشفوا المدينة بعيون أهلها.',
    },
  },
};

// 1. FEZ MEDINA EXPERIENCES
export const FEZ_PILLARS: SectionPillar[] = [
  {
    id: 'fez-explore-medina',
    pageId: 'fez',
    title: {
      en: 'Explore the Medina',
      fr: 'Explorer la Médina',
      ar: 'استكشف المدينة العتيقة',
    },
    subtitle: {
      en: 'Medina Guide',
      fr: 'Guide de la Médina',
      ar: 'دليل المدينة العتيقة',
    },
    shortDescription: {
      en: 'Understand the Medina through its historic lanes, artisan workshops, and everyday life.',
      fr: 'Comprenez la Médina à travers ses ruelles historiques, ses ateliers d’artisans et la vie quotidienne.',
      ar: 'تعرّف على المدينة من خلال أزقتها التاريخية وورش الحرفيين والحياة اليومية لأهل فاس.',
    },
    fullDescription: {
      en: 'Explore the Medina through the supplied story, photographs and local perspective.',
      fr: 'Explorez la Médina à travers le récit, les photographies et le regard local fournis.',
      ar: 'Explore the Medina through the supplied story, photographs and local perspective.',
    },
    highlights: {
      en: ['Historic lanes, gates & souks', 'Workshops & everyday life'],
      fr: ['Ruelles, portes historiques et souks', 'Ateliers d’artisans et vie quotidienne'],
      ar: ['أزقة وأبواب وأسواق تاريخية', 'ورش حرفية وحياة يومية'],
    },
    image: '/images/fez-medina/medina-01.jpg',
    imageAlt: {
      en: 'Traditional Fez Medina market lane with Moroccan flags',
      fr: 'Ruelle traditionnelle de la Médina de Fès avec des drapeaux marocains',
      ar: 'Traditional Fez Medina market lane with Moroccan flags',
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
      ar: 'تاريخ، ثقافة ومعالم فاس العريقة',
    },
    subtitle: {
      en: 'History & Culture',
      fr: 'Histoire & Culture',
      ar: 'التاريخ والثقافة',
    },
    shortDescription: {
      en: 'Trace Fez’s history through its madrasas, landmarks, traditional crafts, and historic neighbourhoods.',
      fr: 'Suivez l’histoire de Fès à travers ses médersas, monuments, métiers d’art et quartiers historiques.',
      ar: 'اكتشف تاريخ فاس عبر المدارس العريقة والمعالم والحرف والأحياء التاريخية.',
    },
    fullDescription: {
      en: 'Fez’s history is part of everyday life. Discover the city’s learning traditions, historic gates and madrasas, crafts, food, Mellah and Fes Jdid, and Chouara Tanneries through local eyes.',
      fr: 'À Fès, l’histoire fait partie de la vie quotidienne. Découvrez ses traditions du savoir, ses portes et médersas historiques, son artisanat, sa cuisine, le Mellah et Fès Jdid, ainsi que les tanneries Chouara à travers des yeux locaux.',
      ar: `تتميز فاس بأن معالمها الكبرى ليست صروحاً معزولة، بل جزء لا يتجزأ من النسيج اليومي للناس. من جامعة القرويين التي أُسست عام 859 م، إلى روائع العمارة المرينية في مدرستي العطارين والبوعنانية، ودار الدباغ شوارة التي ما زالت تعمل بالأساليب الطبيعية ذاتها منذ مئات السنين.`
    },
    highlights: {
      en: ['Madrasas & historic landmarks', 'Mellah, Fes Jdid & traditional crafts'],
      fr: ['Médersas et monuments historiques', 'Mellah, Fès Jdid et artisanat traditionnel'],
      ar: ['مدارس عريقة ومعالم تاريخية', 'الملاح وفاس الجديد والحرف التقليدية']
    },
    image: '/images/fez-history/history-01.jpg',
    imageAlt: {
      en: 'Narrow alley in the old Medina of Fez',
      fr: 'Ruelle étroite dans l’ancienne Médina de Fès',
      ar: 'Narrow alley in the old Medina of Fez',
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
      ar: 'أنشطة وتجارب لا تفوت في فاس',
    },
    subtitle: {
      en: 'Fez City Guide',
      fr: 'Guide de Fès',
      ar: 'دليل فاس',
    },
    shortDescription: {
      en: 'Plan a visit around the souks, craft workshops, local food, panoramic views, and evenings in Fez.',
      fr: 'Organisez votre séjour entre souks, ateliers, cuisine locale, panoramas et soirées dans la Ville Nouvelle.',
      ar: 'خطّط لزيارتك بين الأسواق والورشات والطعام المحلي والإطلالات والأمسيات في فاس.',
    },
    fullDescription: {
      en: `There is much more to do in Fez than simply visiting its famous monuments. The city is best experienced by walking through its streets, meeting local people, discovering traditional crafts, tasting local food and taking time to enjoy the different sides of the city.

Start by exploring the Old Medina of Fez. Walk through its narrow streets, discover the traditional souks, visit historic places and take your time to notice the details around you. Every part of the Medina has its own atmosphere, and sometimes the best experiences are found away from the main tourist streets.

Discover the traditional crafts of Fez by visiting local workshops and watching craftsmen at work. You can see skills such as zellige, leatherwork, woodwork, metalwork and other traditional crafts that have been part of the city's identity for generations.

Take time to explore the historic Mellah and Fes Jdid, enjoy a panoramic view over the Medina walls at sunset, and experience the lively cafés of the New City at night.`,
      fr: `Explorez les ateliers de zellige, de dinanderie et de cuir. Parcourez le quartier historique du Mellah et terminez votre journée devant un coucher de soleil sur les collines mérinides.`,
      ar: `استمتع بزيارة ورشات صناعة الفخار والزليج والنحاسيات، وتجول في أزقة الملاح ذات الشرفات الخشبية المميزة، واختم يومك بإطلالة ساحرة على أسوار فاس أثناء غروب الشمس.`
    },
    highlights: {
      en: ['Souks, workshops & Moroccan food', 'Panoramic views & Fez after dark'],
      fr: ['Souks, ateliers et cuisine marocaine', 'Panoramas et Fès après le coucher du soleil'],
      ar: ['أسواق وورش ومأكولات مغربية', 'إطلالات بانورامية وأجواء المساء']
    },
    image: '/images/fez-things-to-do/things-01.jpg',
    imageAlt: {
      en: 'Busy souk lane in the old Medina of Fez',
      fr: 'Allée animée d’un souk dans l’ancienne médina de Fès',
      ar: 'Busy souk lane in the old Medina of Fez',
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
      ar: 'جولاتنا في فاس',
    },
    subtitle: {
      en: 'Private Walking Tour',
      fr: 'Visite privée à pied',
      ar: 'جولة مشي خاصة',
    },
    shortDescription: {
      en: 'Walk the Medina privately with a local guide and discover its stories, crafts, and hidden corners.',
      fr: 'Parcourez la Médina avec un guide local et découvrez ses histoires, métiers d’art et passages cachés.',
      ar: 'اكتشف المدينة في جولة مشي خاصة مع مرشد محلي، بين القصص والحرف والأزقة المخفية.',
    },
    fullDescription: {
      en: 'Explore our Fez tours and discover the city through local eyes.',
      fr: 'Explorez nos visites de Fès et découvrez la ville à travers des yeux locaux.',
      ar: 'Explore our Fez tours and discover the city through local eyes.',
    },
    highlights: {
      en: ['Private walking tour · 3–5 hours', 'English, Français and Español'],
      fr: ['Visite privée à pied · 3–5 heures', 'Anglais, français et espagnol'],
      ar: ['جولة مشي خاصة لمدة 3–5 ساعات', 'الإنجليزية والفرنسية والإسبانية'],
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
      ar: 'Guide with visitors at a historic Fez monument',
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
      ar: 'رحلة يومية إلى شفشاون (المدينة الزرقاء)',
    },
    subtitle: {
      en: 'The Famous Blue City of Northern Morocco in the Rif Mountains',
      fr: 'La Perle Bleue du Nord du Maroc au cœur du Rif',
      ar: 'جوهرة الشمال الزرقاء وسط أحضان جبال الريف الشامخة',
    },
    shortDescription: {
      en: 'Spend a day discovering Chefchaouen, the famous Blue City of northern Morocco, surrounded by the Rif Mountains.',
      fr: 'Passez une journée à découvrir Chefchaouen, la célèbre ville bleue du nord du Maroc, au cœur des montagnes du Rif.',
      ar: 'اقضِ يوماً في اكتشاف شفشاون، المدينة الزرقاء الشهيرة في شمال المغرب، وسط جبال الريف.',
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
      ar: `اقضِ يوماً في اكتشاف شفشاون، المدينة الزرقاء الشهيرة في شمال المغرب، وسط جبال الريف.

بعد مغادرة فاس، يعبر الطريق الريف المغربي والمناظر الجبلية قبل الوصول إلى شفشاون. هناك تبدأ التجربة بجولة في المدينة العتيقة، حيث الجدران الزرقاء والأزقة الضيقة والبيوت التقليدية تصنع أجواء شفشاون المعروفة.

بحسب المسار والوقت المتاح، يمكن زيارة بعض معالمها، ومنها ساحة وطاء الحمام في قلب المدينة العتيقة، للجلوس على شاي ومشاهدة الحياة المحلية والأجواء حول القصبة التاريخية.

ومن هناك، نواصل عبر الأزقة الزرقاء نحو قصبة شفشاون، أحد معالم المدينة، ثم الأحياء القديمة والدكاكين الصغيرة والبيوت التقليدية.

يمكن أيضاً المشي نحو رأس الماء، المنبع الطبيعي على طرف المدينة العتيقة. مكان مناسب للتمهل، ورؤية الماء المنحدر من الجبل، وملاحظة جانب أكثر محلية من شفشاون.

ويبقى وقت لاستكشاف الأزقة الصغيرة والحرف التقليدية والتقاط الصور وتناول الغداء في المدينة العتيقة. لا نريد أن تشعروا بالاستعجال من معلم إلى آخر، لذلك يبقى السائق مرناً ونأخذ الوقت المتاح للاستمتاع بالوجهة.

يمكن القيام بالرحلة مع سائق خاص فقط، أو مع مرشد محلي يشرح التاريخ والثقافة والأماكن التي تزورونها.`
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
      ar: [
        'رحلة خاصة · سيارة مريحة · وقت مرن',
        'سائق فقط، أو سائق مع مرشد محلي',
        'أزقة زرقاء وساحة وطاء الحمام والقصبة التاريخية',
        'رأس الماء، المنبع على طرف المدينة العتيقة',
        'اكتشفوا شفشاون على وتيرتكم'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~10-11 Hours)', fr: 'Journée entière (~10-11h)', ar: 'يوم كامل (~10-11 ساعة)' },
      departure: { en: '8:00 AM from Fez (Hotel / Riad)', fr: '8h00 de Fès (Hôtel / Riad)', ar: '8:00 صباحاً من فندقكم بفاس' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', ar: 'مركبة خاصة (1 إلى 6 ركاب)' },
      priceMAD: 1400,
      priceEUR: 130,
    },
    image: '/images/daytrip-chefchaouen/blue-alley.webp',
    imageAlt: {
      en: 'Blue alley in Chefchaouen with a studded door and a person walking under an umbrella',
      fr: 'Ruelle bleue de Chefchaouen, porte cloutée et personne marchant sous un parapluie',
      ar: 'زقاق أزرق في شفشاون، باب مرصع وشخص يمشي تحت مظلة',
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
      ar: 'رحلة مكناس ووليلي ومولاي إدريس انطلاقاً من فاس',
    },
    subtitle: {
      en: 'Discover Roman history, Moroccan heritage and an imperial city in one day.',
      fr: 'Découvrir l’histoire romaine, le patrimoine marocain et une ville impériale en une journée.',
      ar: 'اكتشفوا التاريخ الروماني والتراث المغربي ومدينة إمبراطورية في يوم واحد.',
    },
    shortDescription: {
      en: 'Discover three different sides of Morocco’s history in one private day trip from Fez, combining the ancient Roman ruins of Volubilis, the holy town of Moulay Idriss and the historic imperial city of Meknes.',
      fr: 'Découvrez trois facettes de l’histoire du Maroc en une excursion privée au départ de Fès : les ruines romaines de Volubilis, la ville sainte de Moulay Idriss et la cité impériale de Meknès.',
      ar: 'اكتشفوا ثلاثة جوانب مختلفة من تاريخ المغرب في رحلة يومية خاصة انطلاقاً من فاس، تجمع بين آثار وليلي الرومانية ومدينة مولاي إدريس ومدينة مكناس الإمبراطورية.',
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
      ar: `اكتشفوا ثلاثة جوانب مختلفة من تاريخ المغرب في رحلة يومية خاصة انطلاقاً من فاس، تجمع بين آثار وليلي الرومانية، ومدينة مولاي إدريس، ومدينة مكناس الإمبراطورية.

يمكن أن تكون المحطة الأولى وليلي، أحد أهم المواقع الأثرية في المغرب. تجولوا بين بقايا المدينة الرومانية، واكتشفوا شوارعها ومبانيها القديمة، وخذوا وقتكم لتأمل الفسيفساء الشهيرة التي صمدت لقرون. يمنحكم الموقع نظرة مختلفة إلى تاريخ المغرب، قبل المدن والمعالم التي نعرفها اليوم.

من وليلي، تواصلون نحو مولاي إدريس زرهون، بلدة صغيرة مبنية على التلال ومعروفة كوجهة حج مهمة في المغرب. بيوتها البيضاء وأزقتها الضيقة وموقعها على السفح يمنحها أجواء مختلفة جداً عن المدن المغربية الأكبر. حسب الوقت المتاح، يمكنكم المشي في جزء من البلدة، والاستمتاع بالإطلالات، واكتشاف صلتها ببدايات تاريخ المغرب.

ثم تتواصل الرحلة إلى مكناس، إحدى المدن الإمبراطورية الأربع في المغرب. هنا يمكنكم استكشاف قلب المدينة التاريخي، والتجول حول باب المنصور، إحدى أشهر بواباتها الضخمة، واكتشاف المدينة العتيقة والأسوار التاريخية والشوارع التقليدية.

حسب أوقات الفتح واهتماماتكم، يمكنكم أيضاً زيارة بعض المواقع التاريخية في مكناس ومعرفة المزيد عن الفترة التي أصبحت فيها المدينة عاصمة ملكية مهمة في عهد السلطان مولاي إسماعيل.

يمكن أن يبقى ترتيب الزيارات وتوقيتها مرناً خلال اليوم. يمكنكم قضاء وقت أطول في المكان الذي يهمكم، والتوقف للغداء أو للصور، والاستمتاع بالطريق من دون استعجال.

يمكنكم السفر مع سائق خاص فقط، أو اختيار مرشد محلي لشرح أعمق لتاريخ الأماكن وعمارتها وثقافتها.`
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
      ar: [
        'رحلة يومية خاصة',
        'سيارة مريحة',
        'توقيت مرن',
        'سائق فقط، أو سائق مع مرشد محلي',
        'اكتشفوا التاريخ الروماني والتراث المغربي ومدينة إمبراطورية في يوم واحد'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~8 Hours)', fr: 'Journée entière (~8h)', ar: 'يوم كامل (~8 ساعات)' },
      departure: { en: '9:00 AM from Fez', fr: '9h00 de Fès', ar: '9:00 صباحاً من فاس' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', ar: 'سيارة خاصة (1 إلى 6 ركاب)' },
      priceMAD: 1100,
      priceEUR: 100,
    },
    image: '/images/daytrip-meknes/bab-mansour.webp',
    imageAlt: {
      en: 'Volubilis, Moulay Idriss and Meknes',
      fr: 'Volubilis, Moulay Idriss et Meknès',
      ar: 'وليلي ومولاي إدريس ومكناس',
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
      ar: 'رحلة إفران والأطلس المتوسط انطلاقاً من فاس',
    },
    subtitle: {
      en: 'Discover the mountains and landscapes beyond Fez.',
      fr: 'Découvrir les montagnes et les paysages au-delà de Fès.',
      ar: 'اكتشفوا الجبال والمناظر خارج فاس.',
    },
    shortDescription: {
      en: 'Leave the historic streets of Fez behind and spend a day discovering a completely different side of Morocco in Ifrane and the Middle Atlas.',
      fr: 'Laissez les rues historiques de Fès et passez une journée à découvrir une autre facette du Maroc, à Ifrane et dans le Moyen Atlas.',
      ar: 'اتركوا شوارع فاس التاريخية واقضوا يوماً في اكتشاف جانب مختلف من المغرب، في إفران والأطلس المتوسط.',
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
      ar: `اتركوا شوارع فاس التاريخية واقضوا يوماً في اكتشاف جانب مختلف من المغرب، في إفران والأطلس المتوسط.

يأخذكم الطريق تدريجياً من المدينة نحو الجبال، حيث تصبح المناظر أكثر خضرة وبرودة. من أول الأماكن إفران، المعروفة بعمارتها المميزة وشوارعها النظيفة ومساحاتها الخضراء وأجوائها الجبلية. تختلف المدينة كثيراً عن شوارع فاس التقليدية، فيكون الطريق تغييراً حقيقياً في المشهد.

في إفران يمكنكم التجول في البلدة والسير في مناطقها الوسطى ورؤية بعض معالمها، ومنها تمثال الأسد الحجري الشهير الذي أصبح أحد رموز المدينة.

من إفران تتواصل الرحلة نحو الأطلس المتوسط، حيث تصنع الغابات والجبال والريف مشهداً مختلفاً تماماً. حسب الموسم والطقس وحالة الطريق، قد تتاح توقفات للمناظر والصور ومشاوير قصيرة.

التجربة ليست الوصول إلى نقطة بعينها فقط. الطريق نفسه جزء من اليوم، ويمنحكم رؤية جانب آخر من المغرب ومناظر مختلفة جداً عن تلك المحيطة بفاس.

يبقى السائق الخاص مرناً طوال الرحلة، لتأخذوا وقتكم وتتوقفوا حيث يناسبكم. وإذا أردتم معرفة المزيد عن المنطقة ومناظرها والحياة المحلية، يمكنكم أيضاً السفر مع مرشد محلي.`
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
      ar: [
        'رحلة يومية خاصة',
        'سيارة مريحة',
        'توقفات مرنة',
        'سائق فقط، أو سائق مع مرشد محلي',
        'اكتشفوا الجبال والمناظر خارج فاس'
      ]
    },
    practicalInfo: {
      duration: { en: 'Full Day (~7-8 Hours)', fr: 'Journée (~7-8h)', ar: 'يوم كامل (~7-8 ساعات)' },
      departure: { en: '9:00 AM from Fez', fr: '9h00 de Fès', ar: '9:00 صباحاً من فاس' },
      groupSize: { en: 'Private Vehicle (1 to 6 Passengers)', fr: 'Véhicule Privé (1 à 6 pers.)', ar: 'سيارة خاصة (1 إلى 6 ركاب)' },
      priceMAD: 1100,
      priceEUR: 100,
    },
    image: '/images/daytrip-ifrane/mountain-countryside.webp',
    imageAlt: {
      en: 'Ifrane and the Middle Atlas',
      fr: 'Ifrane et le Moyen Atlas',
      ar: 'إفران والأطلس المتوسط',
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
      ar: 'رحلة خاصة ومخصصة حسب رغبتكم',
    },
    subtitle: {
      en: 'Have Somewhere Specific in Mind? Design Your Own Day',
      fr: 'Une destination précise en tête ? Créez votre journée idéale',
      ar: 'هل تود زيارة وجهة معينة؟ صمم برنامجك الخاص بكامل المرونة',
    },
    shortDescription: {
      en: 'Have somewhere specific in mind? We can also organize a private day trip around your own interests.',
      fr: 'Vous avez une idée précise ? Nous pouvons aussi organiser une excursion privée autour de ce qui vous intéresse.',
      ar: 'هل لديكم وجهة بعينها؟ يمكننا أيضاً تنظيم رحلة يومية خاصة حسب اهتماماتكم.',
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
      ar: `هل لديكم وجهة بعينها؟ يمكننا أيضاً تنظيم رحلة يومية خاصة حسب اهتماماتكم.

أخبرونا بما تودون رؤيته وسنساعدكم على إعداد مسار مريح انطلاقاً من فاس. تختارون الأماكن ووقت الانطلاق والمدة في كل محطة.

يبقى السائق مرناً طوال اليوم، حتى لا تشبه التجربة جولة جماعية ثابتة. إذا فضلتم استقلالية أكبر، يمكن السفر مع السائق فقط. وإذا أردتم شروحات وانطباعاً محلياً، نرتب سائقاً مع مرشد.

الفكرة بسيطة: سيارة مريحة، وبرنامج مرن، ويوم مصمم بالطريقة التي تريدون بها اكتشاف المغرب.`
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
      ar: [
        'رحلة خاصة',
        'مسار مرن',
        'سيارة مريحة',
        'سائق فقط، أو سائق مع مرشد محلي',
        'أخبرونا بما تودون اكتشافه'
      ]
    },
    practicalInfo: {
      duration: { en: 'Custom / Flexible', fr: 'Sur mesure / Flexible', ar: 'مخصص / مرن' },
      departure: { en: 'Your Chosen Time & Location', fr: 'Heure et lieu de votre choix', ar: 'الوقت والمكان باختياركم' },
      groupSize: { en: 'Private (1 to 7 Passengers)', fr: 'Privé (1 à 7 personnes)', ar: 'خاص (1 إلى 7 ركاب)' },
      priceMAD: 1200,
      priceEUR: 110,
    },
    image: '/images/daytrip-custom/group-viewpoint.webp',
    imageAlt: {
      en: 'Travelers taking a photo above a mountain town in Morocco',
      fr: 'Voyageurs photographiés au-dessus d’une ville de montagne au Maroc',
      ar: 'مسافرون يلتقطون صورة فوق مدينة جبلية في المغرب',
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
      en: 'Fez Medina Food Tasting Walk',
      fr: 'Balade Dégustation Gourmande dans la Médina',
      ar: 'جولة تذوق الأكلات الشعبية في دروب فاس',
    },
    subtitle: {
      en: 'Taste Fez Through Local Eyes — Not a Sit-Down Dinner, but an Alley Safari',
      fr: 'Goûtez Fès à travers des yeux locaux au fil des ruelles',
      ar: 'تذوق أكلات فاس الشعبية في محلاتها الأصلية وأفرانها العتيقة',
    },
    shortDescription: {
      en: 'To understand Fez, you should taste it. Walk through the Medina and stop at traditional bakeries, small stalls, and local spots to sample Harcha, Baghrir, Chebakia, Sfenj, Bissara, local cheeses, and mint tea.',
      fr: 'Pour comprendre Fès, il faut la goûter ! Goûtez Harcha, Baghrir, Chebakia, Sfenj, Bissara, fromages locaux et thé à la menthe dans les adresses secrètes des Fassis.',
      ar: 'لفهم فاس الحقيقية، يجب أن تتذوق طعامها الشعبي. مسار ممتع لتذوق الحرشة، البغرير، الشباكية، السفنج المقرمش، البيصارة الساخنة، أجبان الجبل والشاي بالنعناع.',
    },
    fullDescription: {
      en: `Taste Fez Through Local Eyes. To understand Fez, you should not only walk through its streets. You should taste them.

Food in Fez is part of everyday life. It is found in small shops, bakeries, market stalls, traditional food places and family kitchens. It is the smell of bread coming from an oven, the sound of people ordering breakfast, the colours of spices in the market, a glass of Moroccan tea shared during a conversation, and small foods that people enjoy throughout the day.

Our food tasting walk takes you into this everyday side of the Medina. This is not simply a tour where you sit down for one large Moroccan meal. Instead, we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets and local products while learning how they are connected to life in Fez.

Depending on the day, season and availability, tastings can include: Harcha, Baghrir, Chebakia, local sweet and salty cheeses, Moroccan mint tea, walnuts, seasonal fresh juices, hot Sfenj doughnuts, rich Bissara bean soup, Zamgawiya, fried fish, liver prepared with chermoula, and Maakouda potato patties.

This is a private, flexible food experience just for you and your group. Come hungry — leave with a taste of Fez!`,
      fr: `Une aventure culinaire unique : marchez dans les ruelles animées et arrêtez-vous dans les échoppes traditionnelles pour savourer une dizaine de spécialités locales authentiques.`,
      ar: `جولة لا تشبه موائد المطاعم العادية؛ بل هي رحلة ميدانية بين الأفران الشعبية ودكاكين الحومة العتيقة لتذوق أشهر المأكولات الفاسية الطازجة والتعرف على قصصها ومكوناتها.`
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
      ar: [
        'تذوق ما بين 8 إلى 10 أكلات شعبية فاسية طازجة ومخبوزات تقليدية',
        'تذوق الحرشة الساخنة، البغرير، السفنج المقرمش والمعقودة الفاسية',
        'صحن بيصارة مغربية ساخنة مع زيت الزيتون البكر والكمون والخبز البلدي',
        'أسرار جلسة الشاي المغربي بالنعناع وتقاليد الضيافة وحسن الاستقبال',
        'جولة خاصة تتيح لكم التوقف والتحدث مع أصحاب الدكاكين والأفران'
      ]
    },
    practicalInfo: {
      duration: { en: '3 to 3.5 Hours', fr: '3 à 3h30', ar: '3 إلى 3.5 ساعات' },
      departure: { en: 'Bab Boujloud or Bab Rcif', fr: 'Bab Boujloud ou Bab Rcif', ar: 'باب بوجلود أو باب الرصيف' },
      groupSize: { en: 'Private (Tastings Included)', fr: 'Privé (Dégustations incluses)', ar: 'خاص (التذوق متضمن بالكامل)' },
      priceMAD: 550,
      priceEUR: 50,
    },
    image: '/src/assets/images/real/food_tasting_walk_image1.jpg',
    imageAlt: {
      en: 'Fresh Moroccan pastries and street food tastings in Fez',
      fr: 'Pâtisseries marocaines et dégustations culinaires à Fès',
      ar: 'أكلات شعبية وحلويات فاسية طازجة في جولة التذوق',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'food-traditional-fassi',
    pageId: 'food-tours',
    title: {
      en: 'Discover Traditional Food of Fez',
      fr: 'Découvrir la Cuisine Traditionnelle Fassie',
      ar: 'المطبخ الفاسي الأصيل وتاريخ الطهي الإمبراطوري',
    },
    subtitle: {
      en: 'Pastilla, Tagines, Couscous & Royal Gastronomy',
      fr: 'Pastilla, tajines mijotés, couscous et gastronomie royale',
      ar: 'البسطيلة الملكية، الطواجن الفاسية العريقة، والكسكس بالسبع خضار',
    },
    shortDescription: {
      en: 'Fez is considered the gastronomic capital of Morocco. Discover why Fassi cuisine is renowned for its refined balance of sweet and savoury, fragrant Ras el Hanout, and centuries of culinary art.',
      fr: 'Capitale gastronomique du Maroc, Fès marie subtilement le sucré et le salé avec sa célèbre Pastilla au pigeon, ses tajines aux pruneaux et ses mélanges d’épices.',
      ar: 'تُعتبر فاس عاصمة الطبخ المغربي بلا منازع. تعرف على أسرار المزيج المتناغم بين الحلو والمالح في البسطيلة الفاسية، وطواجن اللحم بالبرقوق، وتوابل رأس الحانوت النادرة.',
    },
    fullDescription: {
      en: `Fez has a particularly rich culinary heritage. Its food traditions have been influenced by the city's long history and by diverse cultures, including Arab-Andalusian, Jewish and Amazigh influences.

Fassi gastronomy is famous for its intricate balance of sweet and savoury flavours, slow-cooked tagines, and delicate pastries. The legendary Pastilla (pigeon or chicken layered in razor-thin warqa pastry with crushed almonds, cinnamon, and powdered sugar) was perfected here.

From slow-simmered lamb tagine with caramelized prunes and roasted almonds, to fragrant Couscous with seven vegetables and hearty Tfaya, you will understand why recipes passed down through generations of Fassi families are celebrated worldwide.`,
      fr: `Héritière d'un métissage arabo-andalou raffiné, la gastronomie fassie est célèbre pour ses plats emblématiques comme la Pastilla croustillante, le tajine mrouzia au miel et amandes, et le couscous traditionnel.`,
      ar: `يمتلك المطبخ الفاسي إرثاً حضارياً عريقاً تأثر بالثقافة الأندلسية واليهودية والأمازيغية. تميزت فاس بابتكار البسطيلة الفاسية الشهيرة، وطاجين المروزية المعسل، وأطباق الكسكس الملكي المطهوة على نار هادئة.`
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
      ar: [
        'تاريخ وسر تحضير البسطيلة الفاسية الملكية بطبقات الورقة المقرمشة',
        'طرق الطهي البطيء في الطواجن الطينية التقليدية مثل طاجين المروزية',
        'التعرف على خلطة بهارات "رأس الحانوت" الفاسية المكونة من عشرات الأعشاب',
        'عادات المائدة المغربية في الأعياد والمناسبات العائلية الكبرى',
        'توصيات لأفضل مطاعم الرياضات العائلية التي تطبخ على الطريقة المنزلية'
      ]
    },
    practicalInfo: {
      duration: { en: 'Culinary Masterclass & Lunch', fr: 'Masterclass & Déjeuner', ar: 'درس طهي وغداء فاسي' },
      departure: { en: 'Medina Riad Kitchen', fr: 'Cuisine de Riad', ar: 'مطبخ رياض تقليدي' },
      groupSize: { en: 'Private Session (2 to 8 Guests)', fr: 'Session Privée (2 à 8 pers.)', ar: 'جلسة خاصة (2 إلى 8 أفراد)' },
      priceMAD: 650,
      priceEUR: 60,
    },
    image: '/src/assets/images/real/food_traditional_fassi_image1.jpg',
    imageAlt: {
      en: 'Traditional Moroccan tagine with almonds and prunes',
      fr: 'Tajine marocain traditionnel aux pruneaux et amandes',
      ar: 'طاجين مغربي فاسي أصيل بالبرقوق المعسل واللوز',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'food-culture-life',
    pageId: 'food-tours',
    title: {
      en: 'Food Culture & Local Life in Fez',
      fr: 'Culture Culinaire & Vie Quotidienne à Fès',
      ar: 'ثقافة الطعام والحياة اليومية في حومات فاس',
    },
    subtitle: {
      en: 'Neighborhood Ferran Ovens, Communal Traditions & Tea Hospitality',
      fr: 'Fours de quartier traditionnels, rituels familiaux et hospitalité',
      ar: 'أفران الحومة الشعبية، المخبوزات اليومية وثقافة الضيافة بالشاي',
    },
    shortDescription: {
      en: 'Food in Fez is deeply social. Discover how neighborhood communal wood-fired ovens (Ferran) operate, how families bake their daily bread, and how Moroccan mint tea connects friends and strangers alike.',
      fr: 'La nourriture est au cœur du lien social à Fès. Découvrez le rôle central du four communal à bois (Ferran), les rituels du pain quotidien et l’art du thé à la menthe.',
      ar: 'الطعام في فاس رابط اجتماعي وثيق. تعرف على دور "الفران البلدي" في الحومة، وكيف تعجن الأسر خبزها اليومي، وأسرار كرم الضيافة عند تقديم صينية الشاي بالنعناع.',
    },
    fullDescription: {
      en: `Food Is Part of Everyday Life. In the Medina, food is not simply something you eat at a restaurant table; it is woven into the neighborhood architecture and social rituals.

One of the most fascinating aspects is the neighborhood Ferran (communal wood-fired oven). For centuries, families have prepared dough at home and sent children with wooden boards balancing bread loaves to the local baker, who marks each family's bread with a distinct signature slash before baking it on fragrant cedar or olive wood coals.

During our cultural food discovery, we step inside these active neighborhood ovens, visit traditional spice shops, understand the communal values of Moroccan dining, and experience genuine hospitality.`,
      fr: `Poussez les portes du Ferran de quartier, où le boulanger cuit au feu de bois les pains façonnés chaque matin par les familles de la médina. Un témoignage vivant de solidarité et de tradition.`,
      ar: `ادخل إلى قلب "الفران البلدي" الذي ما زال يجمع أهل الحومة منذ قرون؛ حيث يحمل الجيران خبزهم المعجون في البيوت ليطهى على حطب الزيتون والأرز بنكهة لا تُنسى، مع فهم عادات المشاركة في المائدة الواحدة.`
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
      ar: [
        'زيارة فران الحومة الشعبي المشتغل بالحطب التقليدي',
        'مشاهدة الخباز وهو يصفف أطباق الخبز الخشبي بمجرفته الطويلة بحرفية',
        'التعرف على آداب المائدة المشتركة في الثقافة المغربية',
        'تقاليد المواسم الدينية وموسم عصر زيت الزيتون في خريف فاس',
        'شرب كؤوس الشاي المنعنع المحضر بأعشاب الحديقة العطرية'
      ]
    },
    practicalInfo: {
      duration: { en: '2.5 Hours', fr: '2h30', ar: 'ساعتان ونصف' },
      departure: { en: 'Bab Rcif Medina Entrance', fr: 'Entrée Bab Rcif', ar: 'باب الرصيف' },
      groupSize: { en: 'Small Private Group', fr: 'Petit groupe privé', ar: 'مجموعة خاصة صغيرة' },
      priceMAD: 350,
      priceEUR: 32,
    },
    image: '/src/assets/images/real/food_culture_life_image1.jpg',
    imageAlt: {
      en: 'Communal bread oven and daily food life in Fez',
      fr: 'Four à pain de quartier et vie quotidienne à Fès',
      ar: 'فرن الحومة الشعبي والحياة اليومية في فاس البالي',
    },
    actionType: 'book_tour',
    published: true,
  },
  {
    id: 'food-markets-souks',
    pageId: 'food-tours',
    title: {
      en: 'Local Markets & Souks of Fez',
      fr: 'Marchés Locaux & Souks Gourmands de Fès',
      ar: 'أسواق الأغذية والتوابل الشعبية في فاس',
    },
    subtitle: {
      en: 'Spices, Olives, Fresh Produce & Honey Markets of the Medina',
      fr: 'Épices, olives marinées, fruits frais et marché du miel',
      ar: 'سوق العطارين، دكاكين الزيتون، الخضر الطازجة وسوق العسل الحر',
    },
    shortDescription: {
      en: 'The souks of Fez are the pantry of the city. Walk through Souk el-Attarine, taste marinated Atlas olives, discover rare Moroccan spices, pure mountain honey, and fresh culinary herbs.',
      fr: 'Parcourez les souks alimentaires animés : pyramides de curcuma et safran, olives marinées aux herbes, dattes du Sahara et miels de montagne.',
      ar: 'جولة بين ألوان وروائح أسواق فاس العتيقة: تلال التوابل الفواحة، براميل الزيتون المغربي المتبل بالأعشاب، التمور الصحراوية وعسل الجبال الحر.'
    },
    fullDescription: {
      en: `The souks of Fez are not just tourist attractions; they are the living pantry where local families buy their fresh ingredients every morning.

Walk through Souk el-Attarine, famous since the Middle Ages for spices, incense, natural remedies, and perfumes. Taste cured olives in garlic, harissa, and wild thyme from huge wooden barrels. Discover fragrant saffron from Taliouine, pure argan oil, dried rosebuds, and wild mountain honeys (thyme, lavender, and eucalyptus).

Your local guide will help you understand local produce, compare quality, and interact respectfully with stallholders.`,
      fr: `Découvrez les étals vibrants du Souk el-Attarine, le marché aux olives de Bab Rcif et apprenez à reconnaître le véritable safran de Taliouine et l'huile d'argan pure.`,
      ar: `جولة في سوق العطارين التاريخي، وسوق الزيتون بباب الرصيف؛ حيث تتعلم التمييز بين الزعفران الحر المغشوش والأصلي، وأجود أنواع زيت الأركان وعسل الدغموس والسدر.`
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
      ar: [
        'استكشاف سوق العطارين ومخازن التوابل والأعشاب الطبية التاريخية',
        'تذوق أصناف الزيتون المغربي المتبل بالحار والزعتر والليمون',
        'إرشادات لمعرفة الزعفران التالويني الحر وزيت الأركان الأصلي',
        'تذوق أنواع عسل النحل الجبلي الطبيعي (الزعتر، الدغموس، والليمون)',
        'حوارات لطيفة مع تجار الأسواق القديمة في أجواء ترحيبية صادقة'
      ]
    },
    practicalInfo: {
      duration: { en: '2.5 to 3 Hours', fr: '2h30 à 3h', ar: 'ساعتان ونصف إلى 3 ساعات' },
      departure: { en: 'Bab Boujloud Gate', fr: 'Porte Bab Boujloud', ar: 'باب بوجلود' },
      groupSize: { en: 'Private Market Walk', fr: 'Balade Privée au Marché', ar: 'جولة خاصة في الأسواق' },
      priceMAD: 400,
      priceEUR: 38,
    },
    image: '/src/assets/images/real/food_markets_souks_image1.jpg',
    imageAlt: {
      en: 'Vibrant spice souk and colorful produce in Fez',
      fr: 'Souk des épices coloré et produits frais à Fès',
      ar: 'سوق التوابل والأعشاب بألوانه وروائحه الزكية في فاس',
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
      ar: 'دليل التخطيط لزيارة فاس',
    },
    subtitle: {
      en: 'Best Seasons, Ideal Duration, Neighborhoods & Weather',
      fr: 'Meilleures saisons, durée idéale, météo et quartiers',
      ar: 'أفضل أوقات الزيارة، المدة المقترحة، الطقس واختيار الأحياء',
    },
    shortDescription: {
      en: 'Make the most of your journey to Fez. Learn why spring and autumn are the ideal travel months, how many days you need (2 to 4 days), and where to stay between authentic Riads and modern hotels.',
      fr: 'Conseils pour réussir votre voyage : printemps et automne privilégiés, durée idéale de 2 à 4 jours, et choix entre Riad traditionnel et hôtel moderne.',
      ar: 'كل ما تحتاج لمعرفته قبل السفر: لماذا يعتبر الربيع والخريف أفضل الفصول، المدة المثالية (2 إلى 4 أيام)، والفرق بين الإقامة في رياض عتيق أو فندق حديث.',
    },
    fullDescription: {
      en: `Planning Your Visit to Fez. A few simple preparations can make your stay in Fez much more enjoyable and relaxing.

When to Visit: Spring (March to May) and Autumn (September to November) offer comfortable daytime temperatures and pleasant evenings, making them the most comfortable months for walking through the Medina. Summer can be quite warm, while winter brings cooler days and chilly evenings.

How Long to Stay: Two to three days allows you to discover the main areas of the Old Medina, visit key historic landmarks, enjoy a food tasting experience, and take in panoramic viewpoints. If you plan to add day trips to Chefchaouen or Volubilis, four to five days is ideal.

Where to Stay: Staying inside a traditional Riad in Fes el-Bali offers an authentic historical atmosphere with interior courtyards and tiled fountains. Alternatively, the Ville Nouvelle offers modern hotels with car access right to the door.`,
      fr: `Privilégiez le printemps et l'automne pour une météo clémente. Prévoyez 3 jours pour la médina et 1 à 2 jours supplémentaires pour les excursions vers Chefchaouen et Volubilis.`,
      ar: `يُفضل زيارة فاس في فصلي الربيع والخريف حيث الطقس معتدل ومثالي للمشي في الدروب. يُنصح بقضاء 3 أيام لاستكشاف المدينة، وإضافة يومين في حال الرغبة في زيارة شفشاون ووليلي.`
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
      ar: [
        'أفضل أوقات السفر: فترتا الربيع (مارس-مايو) والخريف المعتدل (سبتمبر-نوفمبر)',
        'المدة الموصى بها: 2 إلى 3 أيام للمدينة العتيقة، و4 إلى 5 أيام مع الرحلات الخارجية',
        'الإقامة: سحر الرياضات التاريخية داخل الدروب أو فنادق المدينة الجديدة بسهولة المواصلات',
        'حقيبة السفر: ملابس خفيفة ومريحة ومحترمة، وحذاء مشي متين ومريح',
        'المطار: مطار فاس سايس الدولي (FEZ) يقع على بعد 25 دقيقة فقط من المدينة'
      ]
    },
    practicalInfo: {
      duration: { en: 'Travel Guide', fr: 'Guide Pratique', ar: 'دليل السفر' },
      departure: { en: 'Fez Destination Guide', fr: 'Guide Destination Fès', ar: 'دليل فاس السياحي' },
      groupSize: { en: 'Free Local Knowledge', fr: 'Conseils Gratuits', ar: 'معلومات محلية مجانية' },
    },
    image: '/src/assets/images/real/tips_plan_trip_image1.jpg',
    imageAlt: {
      en: 'Panoramic view over the rooftops of Fez during sunset',
      fr: 'Vue panoramique sur les toits de Fès au coucher du soleil',
      ar: 'منظر بانورامي بديع لمدينة فاس عند غروب الشمس',
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
      ar: 'المواصلات والتنقل في فاس (المشي، الأبواب، والتاكسي الأحمر)',
    },
    subtitle: {
      en: 'Pedestrian Medina, Historic Gates, Red Petit Taxis & City Access',
      fr: 'Médina piétonne, portes principales, petits taxis rouges et trajets',
      ar: 'المدينة الخالية من السيارات، الأبواب الرئيسية، وطريقة ركوب التاكسي الصغير',
    },
    shortDescription: {
      en: 'Getting around Fez is unique. The Old Medina is completely pedestrian with narrow lanes. Outside the walls, red Petit Taxis are easy and cheap (10–20 MAD). Learn how to navigate with ease.',
      fr: 'La Médina est 100% piétonne. À l’extérieur des remparts, les petits taxis rouges sont très pratiques et économiques (10 à 20 MAD la course en ville).',
      ar: 'التنقل في فاس مميز جداً: فاس البالي مخصصة بالكامل للمشاة دون سيارات، وخارج الأسوار تتوافر سيارات التاكسي الأحمر الصغيرة بأسعار مناسبة جداً (10-20 درهم).',
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
      ar: `فاس البالي مدينة بيئية تاريخية خالية من السيارات؛ حيث ينزل الزوار عند أحد الأبواب الرئيسية مثل باب بوجلود، باب الرصيف أو ساحة البطحاء للمتابعة مشياً. وللتنقل للمدينة الجديدة، تكفي الإشارة لسيارة تاكسي أحمر بعداد نظامي بتكلفة تتراوح بين 10 و20 درهماً.`
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
      ar: [
        'مدينة للمشاة: فاس البالي أكبر منطقة حضرية تاريخية خالية تماماً من السيارات',
        'أبواب ركوب السيارات: باب بوجلود، باب الرصيف، عين أزليطن، وساحة البطحاء',
        'التاكسي الصغير (الأحمر): يتسع لـ 3 ركاب، وتعرفة الرحلة العادية بين 10 و20 درهماً',
        'السيارات السياحية الخاصة: الخيار الأمثل للتوصيل من المطار والرحلات اليومية المريحة',
        'فائدة المرشد المحلي: استكشاف واثق وممتع دون الحاجة المستمرة للنظر في الهاتف والخرائط'
      ]
    },
    practicalInfo: {
      duration: { en: 'Transit Guide', fr: 'Guide Transports', ar: 'دليل التنقل' },
      departure: { en: 'Medina Gates & City', fr: 'Portes & Ville', ar: 'أبواب فاس والمدينة' },
      groupSize: { en: 'Practical Local Advice', fr: 'Conseils Utiles', ar: 'إرشادات عملية' },
    },
    image: '/src/assets/images/real/tips_getting_around_image1.jpg',
    imageAlt: {
      en: 'Red Petit Taxis outside the historic gates of Fez',
      fr: 'Petits taxis rouges devant les portes historiques de Fès',
      ar: 'سيارات التاكسي الأحمر أمام بوابات فاس التاريخية',
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
      ar: 'نصائح وإرشادات عملية للزوار',
    },
    subtitle: {
      en: 'Cash, Shoes, Modesty, Safety, Friday Rhythm & Photography',
      fr: 'Espèces, chaussures, tenue vestimentaire, rythme du vendredi et photos',
      ar: 'العملة النقدية، الأحذية المريحة، اللباس المحترم، يوم الجمعة والتصوير',
    },
    shortDescription: {
      en: 'A few simple things make your stay in Fez comfortable and stress-free. Carry local cash (MAD), wear comfortable walking shoes, dress respectfully, respect the Friday rhythm, and enjoy local tea breaks.',
      fr: 'Quelques réflexes simples garantissent un séjour serein : prévoir des espèces (MAD), des chaussures confortables, une tenue respectueuse et profiter des pauses thé.',
      ar: 'نصائح سهلة تجعل رحلتك سلسة وممتعة: حمل نقود بالدرهم المغربي، ارتداء حذاء مشي مريح، لباس محتشم، احترام خصوصية الناس عند التصوير، والتمهل والاستمتاع.',
    },
    fullDescription: {
      en: `A few simple things can make your stay in Fez much easier and more comfortable. Fez is a historic city with its own rhythm and customs. Knowing a few practical details can help you feel at home:

Carry Some Cash: While hotels and upscale riads accept credit cards, cash in Moroccan Dirhams (MAD) is essential for small shops, local food stalls, tips, and taxis. Keep small coins and bills with you.

Wear Comfortable Shoes: You will walk more than expected in the Medina. The stone streets can be uneven with slopes and steps. Good walking shoes make a world of difference.

Dress Respectfully: Fez is a traditional cultural center. Modest clothing covering shoulders and knees is appreciated, particularly when passing near religious sites and traditional neighborhoods.

Friday Has a Different Rhythm: Friday is the holy day in Morocco. Many traditional shops close or operate on a slower schedule between 12:00 PM and 3:30 PM for Friday communal prayers. Plan museum and market visits accordingly.

Photography Etiquette: Always ask with a warm smile before taking close-up photos of craftsmen or shopkeepers. A little courtesy goes a very long way!`,
      fr: `Gardez toujours des dirhams liquides sur vous, portez de bonnes chaussures de marche, prévoyez des vêtements couvrant épaules et genoux, et demandez poliment avant de photographier les habitants.`,
      ar: `احرص دائماً على حمل مبالغ نقدية بالدرهم، ارتدِ حذاءً مريحاً للمشي لساعات، اختر ملابس محتشمة ومريحة، واطلب الإذن بلباقة قبل التقاط صور مقربة للصناع التقليديين وأهل الحومة.`
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
      ar: [
        'احتفظ دائماً بنقود بالدرهم المغربي للدفع في الأسواق والمقاهي وسيارات الأجرة',
        'ارتدِ حذاء مشي مريحاً لملاءمة الأزقة التاريخية المرصوفة والدرجات الحجرية',
        'اختر ملابس مريحة ومحتشمة تناسب تقاليد وهوية المدينة العريقة',
        'خصوصية يوم الجمعة: تغلق بعض الدكاكين الشعبية بين الظهر والعصر لأداء الصلاة',
        'أدب التصوير: استئذان الأشخاص والصناع بابتسامة قبل التقاط الصور التذكارية',
        'شريحة الهاتف المحمول: سهلة الشراء في المطار أو مراكز الاتصالات لتفعيل الإنترنت'
      ]
    },
    practicalInfo: {
      duration: { en: 'Local Advice', fr: 'Conseils Pratiques', ar: 'نصائح وإرشادات' },
      departure: { en: 'Essential Preparation', fr: 'Préparation Voyage', ar: 'استعدادات هامة' },
      groupSize: { en: 'Visitor Etiquette', fr: 'Savoir-vivre Local', ar: 'آداب الزيارة' },
    },
    image: '/src/assets/images/real/tips_practical_image1.jpg',
    imageAlt: {
      en: 'Traditional Moroccan tea, crafts, and relaxed Medina moments',
      fr: 'Moment de détente autour d’un thé marocain dans la médina',
      ar: 'جلسة شاي مغربي هادئة وأجواء الضيافة الفاسية العريقة',
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
      ar: 'المؤسس والمضيف المحلي',
    },
    bio: {
      en: 'Based in Fez, Med created Fez Guide Tours to share his home city with world travellers in a simple, comfortable and personal way. He coordinates closely with guests, native guides, and trusted partners to curate unforgettable experiences.',
      fr: 'Basé à Fès, Med a créé Fez Guide Tours pour partager sa ville natale avec les voyageurs de manière simple, chaleureuse et sur mesure. Il coordonne chaque visite avec soin.',
      ar: 'ابن مدينة فاس ومؤسس فاس جايد تورز. كرس شغفه لتمكين الزوار من استكشاف فاس بطريقة مريحة، بسيطة وشخصية، وينسق يومياً مع المرشدين والسائقين لضمان أرقى تجربة.',
    },
    languages: ['Arabic', 'English', 'French'],
    experience: { en: 'Native Fassi Host', fr: 'Hôte Natif de Fès', ar: 'ابن فاس الأصلي' },
    avatarUrl: '/src/assets/images/real/about_us_image1.jpg',
  },
  {
    id: 'team-guides',
    name: 'Our Local Guides',
    role: {
      en: 'Knowledgeable Native Guides',
      fr: 'Guides Locaux Passionnés',
      ar: 'مرشدونا المحليون المعتمدون',
    },
    bio: {
      en: 'We work with licensed local guides who truly know Fez, its history, architecture, Medina, and living culture. They share their deep knowledge, answer all your questions, and help you discover the city through local eyes.',
      fr: 'Nous travaillons avec des guides locaux expérimentés qui maîtrisent l’histoire, les trésors architecturaux et les ruelles secrètes de Fès pour vous offrir une visite passionnante.',
      ar: 'فريق من خيرة المرشدين السياحيين من أبناء فاس العتيقة، على دراية عميقة بتاريخ المدينة، معالمها، أزقتها، وحرفها، يجيبون عن كافة تساؤلاتكم بكل كرم واعتزاز.',
    },
    languages: ['English', 'French', 'Spanish', 'Arabic'],
    experience: { en: '10+ Years in Medina', fr: '10+ ans d’expérience', ar: 'أكثر من 10 سنوات خبرة' },
    avatarUrl: '/src/assets/images/real/about_us_image2.jpg',
  },
  {
    id: 'team-drivers',
    name: 'Our Drivers & Partners',
    role: {
      en: 'Trusted Drivers & Regional Hosts',
      fr: 'Chauffeurs de Confiance & Partenaires',
      ar: 'سائقونا وشركاؤنا الموثوقون',
    },
    bio: {
      en: 'For scenic day trips, airport transfers, and excursions across northern Morocco, we work with professional, trusted local drivers with comfortable, modern air-conditioned vehicles to ensure your journey is safe, relaxing, and on schedule.',
      fr: 'Pour vos excursions vers Chefchaouen, Meknès ou l’Atlas, nos chauffeurs professionnels vous garantissent confort, sécurité et ponctualité à bord de véhicules récents.',
      ar: 'لرحلات اليوم الواحد ونقل المطار، نوفر سائقين محترفين ومركبات سياحية حديثة ومكيفة تضمن سلامتكم وراحتكم التامة ومرونة كاملة في المواعيد والتوقفات.',
    },
    languages: ['Arabic', 'French', 'English'],
    experience: { en: 'Professional Fleet', fr: 'Flotte Confortable', ar: 'أسطول سياحي مريح' },
    avatarUrl: '/src/assets/images/real/about_us_image5.jpg',
  },
];

export const ABOUT_STORY = {
  title: {
    en: 'About Us & Our Team',
    fr: 'À Propos de Nous & Notre Équipe',
    ar: 'من نحن وفريق عملنا المحلي',
  },
  subtitle: {
    en: 'A small local team based in Fez dedicated to sharing our city in a simple, comfortable and personal way.',
    fr: 'Une équipe locale basée à Fès dédiée à vous faire découvrir notre ville avec simplicité et confort.',
    ar: 'فريق محلي من أبناء فاس نسعى لمشاركتكم روح مدينتنا بأسلوب بسيط، مريح وشخصي.',
  },
  storyParagraph1: {
    en: 'We are a small local team based in Fez. We created Fez Guide Tours to share our city with travellers and help them discover Fez in a simple, comfortable and personal way. We know the streets of the Medina, the different areas of the city, the local food, traditions and everyday life. Our goal is simple: to help you enjoy Fez and discover the city through local eyes.',
    fr: 'Nous sommes une petite équipe locale basée à Fès. Nous avons créé Fez Guide Tours pour partager notre passion et aider les voyageurs à découvrir la ville en toute simplicité, confort et authenticité. Notre objectif est clair : vous faire vivre Fès à travers des yeux locaux.',
    ar: 'نحن فريق محلي مقيم في فاس. أنشأنا "فاس جايد تورز" لمشاركة مدينتنا مع المسافرين ومساعدتهم على استكشاف فاس بطريقة بسيطة ومريحة وشخصية. نعرف دروب المدينة العتيقة، أحياءها المختلفة، مأكولاتها الشعبية، تقاليدها وتفاصيل حياتها اليومية. هدفنا واضح وبسيط: أن تستمتع بفاس وتراها بعيون أهلها.',
  },
  storyParagraph2: {
    en: 'Why We Do It: We believe that the best way to discover Fez is not only by visiting its famous places, but also by seeing how the city really lives. We want to welcome you to our city, share what we know and help you create good memories in Fez. Welcome to Fez. See the city through local eyes.',
    fr: 'Pourquoi nous le faisons : Nous croyons que la meilleure façon de découvrir Fès n’est pas seulement de visiter ses monuments célèbres, mais de comprendre comment la ville vit réellement. Nous voulons vous accueillir chaleureusement et créer des souvenirs inoubliables.',
    ar: 'لماذا نقوم بذلك؟ لأننا نؤمن بأن أفضل طريقة لاكتشاف فاس ليست مجرد زيارة صروحها الشهيرة عن بعد، بل مشاهدة كيف تعيش المدينة حقاً في تفاصيلها اليومية. نود الترحيب بكم في مدينتنا، ومشاركتكم ما نعرفه ومساعدتكم على صنع ذكريات جميلة تدوم طويلاً.',
  },
  pillars: [
    {
      title: { en: 'Born & Based in Fez', fr: 'Nés & Basés à Fès', ar: 'أبناء فاس وسكانها' },
      desc: {
        en: 'We live here, understand every corner, and navigate the Medina with natural ease.',
        fr: 'Nous vivons ici et connaissons chaque recoin de la médina depuis notre enfance.',
        ar: 'نعيش هنا، ونعرف كل زقاق وحومة، ونتنقل في دروب فاس بأريحية عفوية.',
      },
    },
    {
      title: { en: 'Private & Personal', fr: 'Visites Privées & Sur Mesure', ar: 'جولات خاصة وشخصية' },
      desc: {
        en: 'Dedicated experiences for you and your group, moving at your pace with no rushed crowds.',
        fr: 'Des expériences exclusives adaptées à votre rythme, sans la contrainte des grands groupes.',
        ar: 'تجارب مخصصة لكم ولمجموعتكم بالوتيرة التي تناسبكم بعيداً عن صخب المجموعات الكبيرة.',
      },
    },
    {
      title: { en: 'Comfort & Trust', fr: 'Confort & Confiance', ar: 'راحة وأمان وموثوقية' },
      desc: {
        en: 'Clear communication, comfortable vehicles, and honest local guidance every step of the way.',
        fr: 'Communication fluide, véhicules climatisés confortables et conseils bienveillants.',
        ar: 'تواصل واضح وسريع، سيارات مريحة ومكيفة، وتوجيه محلي صادق في كل خطوة.',
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
      ar: 'ما هي أنواع الجولات والتجارب التي تقدمونها في فاس؟',
    },
    answer: {
      en: 'We offer private tours and local experiences in Fez, including Medina walking tours, food and tasting experiences, cultural visits, and customized itineraries. We also organize private day trips from Fez to destinations such as Chefchaouen, Meknes, Volubilis, Moulay Idriss and Ifrane in the Middle Atlas.',
      fr: 'Nous proposons des visites privées de la médina, des balades dégustations de street food, des découvertes culturelles et des excursions privées vers Chefchaouen, Meknès, Volubilis et Ifrane.',
      ar: 'نقدم جولات خاصة مشياً على الأقدام في فاس العتيقة، جولات تذوق الأكلات الشعبية، زيارات ثقافية ومعمارية مخصصة، بالإضافة إلى رحلات يومية خاصة إلى شفشاون، مكناس، وليلي، وإفران.',
    },
  },
  {
    id: 'faq-2',
    category: 'tours',
    question: {
      en: 'Are your tours private?',
      fr: 'Vos visites sont-elles privées ?',
      ar: 'هل جولاتكم خاصة أم جماعية؟',
    },
    answer: {
      en: 'Most of our experiences are arranged privately, meaning the experience is exclusively for you and your travelling group rather than a large group of strangers. This allows you to ask questions, take your time, and enjoy a much more personal pace.',
      fr: 'La quasi-totalité de nos expériences sont organisées en privé, exclusivement pour vous et vos compagnons de voyage, afin de garantir un rythme détendu et personnalisé.',
      ar: 'نعم، معظم تجاربنا وجولاتنا خاصة بالكامل لك ولمجموعتك فقط، مما يمنحكم حرية طرح الأسئلة، التقاط الصور، والتحرك بالوتيرة التي تريحكم دون أي استعجال.',
    },
  },
  {
    id: 'faq-3',
    category: 'tours',
    question: {
      en: 'Can I customize my tour?',
      fr: 'Puis-je personnaliser mon itinéraire ?',
      ar: 'هل يمكنني تعديل أو تخصيص برنامج الجولة؟',
    },
    answer: {
      en: 'Yes. If you have specific places you want to visit, particular dietary preferences, or limited time, simply tell us before or upon booking. We will gladly adapt the route or schedule where possible.',
      fr: 'Absolument. Si vous avez des centres d’intérêt spécifiques ou des contraintes de temps, faites-le nous savoir et nous adapterons le parcours avec plaisir.',
      ar: 'بالتأكيد! إذا كانت لديك أماكن محددة ترغب في رؤيتها، أو متطلبات خاصة بالوقت أو الطعام، أخبرنا وسنقوم بتكييف المسار بما يناسب تطلعاتك.',
    },
  },
  {
    id: 'faq-4',
    category: 'booking',
    question: {
      en: 'How can I book a tour or ask questions?',
      fr: 'Comment réserver ou poser une question ?',
      ar: 'كيف يمكنني الحجز أو طرح استفسار؟',
    },
    answer: {
      en: 'You can book through the online reservation form on our site, or reach out to us directly via WhatsApp or email. We are always ready to answer your questions and coordinate details.',
      fr: 'Vous pouvez réserver via le formulaire de notre site ou nous contacter directement sur WhatsApp pour une réponse rapide.',
      ar: 'يمكنك الحجز بسهولة عبر نموذج الحجز في الموقع، أو مراسلتنا مباشرة عبر الواتساب أو البريد الإلكتروني وسنرد عليك بكل سرور لمساعدتك.',
    },
  },
  {
    id: 'faq-5',
    category: 'booking',
    question: {
      en: 'Can I book at short notice?',
      fr: 'Puis-je réserver à la dernière minute ?',
      ar: 'هل تقبلون الحجوزات في وقت قصير أو في نفس اليوم؟',
    },
    answer: {
      en: 'We always do our best to accommodate last-minute requests depending on guide and driver availability. For the widest choice of times and preferred language, we recommend booking a few days in advance.',
      fr: 'Nous faisons tout notre possible pour satisfaire les demandes de dernière minute selon la disponibilité de nos guides et véhicules.',
      ar: 'نبذل قصارى جهدنا لتلبية الحجوزات السريعة حسب توفر المرشدين والسيارات، وننصح بالحجز المسبق لضمان الوقت واللغة المفضلة لديك.',
    },
  },
  {
    id: 'faq-6',
    category: 'guides',
    question: {
      en: 'Are your guides native to Fez and what languages do they speak?',
      fr: 'Vos guides sont-ils locaux et quelles langues parlent-ils ?',
      ar: 'هل المرشدون من أبناء فاس وما هي اللغات التي يتحدثون بها؟',
    },
    answer: {
      en: 'Yes. We work with local guides who were born in and know Fez deeply. Depending on availability, our experiences can be conducted in English, French, and Spanish. Let us know if you require another language.',
      fr: 'Oui, nos guides sont natifs de Fès. Nous proposons des visites en anglais, français et espagnol, ainsi que d’autres langues sur demande.',
      ar: 'نعم، جميع مرشدينا من أبناء فاس المقيمين بها. نوفر الجولات باللغات الإنجليزية، الفرنسية، والإسبانية، ولغات أخرى حسب التوفر.',
    },
  },
  {
    id: 'faq-7',
    category: 'transport',
    question: {
      en: 'Where do we meet for a Medina tour? Can you pick us up from our riad?',
      fr: 'Où se fait le rendez-vous ? Pouvez-vous venir à notre riad ?',
      ar: 'أين نلتقي لبدء الجولة؟ وهل يمكنكم الحضور إلى الرياض؟',
    },
    answer: {
      en: 'Common meeting points include Bab Boujloud or Bab Rcif. If your riad is located inside the pedestrian Medina, we can often meet you directly at your riad door, or at the closest accessible gate where walking begins.',
      fr: 'Les points de rencontre habituels sont Bab Boujloud ou Bab Rcif. Si votre riad est dans la médina, votre guide peut venir vous y rejoindre directement.',
      ar: 'نقاط الالتقاء المعتادة هي باب بوجلود أو باب الرصيف. إذا كان رياضكم داخل فاس البالي، يمكن للمرشد الحضور إلى باب الرياض مباشرة لبدء الجولة.',
    },
  },
  {
    id: 'faq-8',
    category: 'transport',
    question: {
      en: 'Do you provide transportation for day trips?',
      fr: 'Fournissez-vous le transport pour les excursions ?',
      ar: 'هل توفرون وسيلة النقل في الرحلات اليومية؟',
    },
    answer: {
      en: 'Yes. All our day trips outside Fez (Chefchaouen, Meknes/Volubilis, Ifrane) include comfortable, private, air-conditioned vehicles with trusted professional drivers who pick you up and drop you off directly at your accommodation.',
      fr: 'Oui, toutes nos excursions incluent un véhicule privé moderne et climatisé avec chauffeur professionnel, avec prise en charge aller-retour à votre hôtel.',
      ar: 'نعم، تشمل جميع رحلاتنا اليومية خارج فاس سيارات سياحية خاصة مكيفة ومريحة مع سائق محترف يتولى التوصيل من وإلى مكان إقامتكم.',
    },
  },
  {
    id: 'faq-9',
    category: 'walking',
    question: {
      en: 'Is the Old Medina difficult to walk around?',
      fr: 'La médina est-elle difficile pour la marche ?',
      ar: 'هل المشي في فاس العتيقة متعب أو شاق؟',
    },
    answer: {
      en: 'The Medina involves walking along pedestrian streets that include slight slopes, steps, and uneven stones. You do not need to be a hiker, but comfortable walking shoes are strongly recommended. Since tours are private, we can take as many breaks as you like!',
      fr: 'La médina comprend des ruelles pavées et quelques marches. De bonnes chaussures de marche sont recommandées, et nous adaptons le rythme à vos souhaits.',
      ar: 'تتطلب المدينة العتيقة المشي في دروب مبلطة تضم بعض المنحدرات والدرجات. نوصي بارتداء حذاء مشي مريح، وبما أن الجولة خاصة يمكننا التوقف للراحة والشاي متى شئتم.',
    },
  },
  {
    id: 'faq-10',
    category: 'food',
    question: {
      en: 'What food will we taste on the food tour, and can you accommodate dietary restrictions?',
      fr: 'Que mange-t-on lors du food tour et gérez-vous les allergies ?',
      ar: 'ما هي الأكلات التي نتذوقها وهل تراعون الحساسية والخيارات الغذائية؟',
    },
    answer: {
      en: 'Tastings vary with seasonal markets and include Harcha, Baghrir, Chebakia, Sfenj doughnuts, Bissara soup, local goat cheeses, olives, seasonal fruits, and mint tea. Please inform us of any allergies or dietary restrictions (vegetarian, nut allergies, etc.) when booking.',
      fr: 'Vous dégusterez Harcha, Baghrir, Chebakia, Sfenj, soupe Bissara, fromages locaux et thé à la menthe. Veuillez nous signaler vos éventuelles allergies dès la réservation.',
      ar: 'تشمل التذوقات الحرشة، البغرير، الشباكية، السفنج، البيصارة، أجبان الجبل، الزيتون والشاي. يرجى إخبارنا بأي حساسية غذائية لنكيف التذوق بما يناسبكم.',
    },
  },
  {
    id: 'faq-11',
    category: 'daytrips',
    question: {
      en: 'Which destinations can I visit on a day trip from Fez?',
      fr: 'Quelles sont les destinations possibles en excursion d’une journée ?',
      ar: 'ما هي الوجهات التي يمكن زيارتها في رحلة يوم واحد من فاس؟',
    },
    answer: {
      en: 'Our popular day trips include Chefchaouen, Meknes with Volubilis and Moulay Idriss, and Ifrane in the Middle Atlas. We can also create custom private itineraries based on your wishes.',
      fr: 'Nos excursions phares sont Chefchaouen, Meknès avec Volubilis et Moulay Idriss, et Ifrane dans le Moyen Atlas.',
      ar: 'أشهر رحلاتنا اليومية هي شفشاون، ومكناس مع وليلي ومولاي إدريس، وإفران في الأطلس المتوسط، بالإضافة إلى أي مسار مخصص.',
    },
  },
  {
    id: 'faq-12',
    category: 'general',
    question: {
      en: 'Do I need to carry cash in Fez?',
      fr: 'Dois-je avoir de l’argent liquide sur moi ?',
      ar: 'هل من الضروري حمل مبالغ نقدية بالدرهم في فاس؟',
    },
    answer: {
      en: 'Yes. Carrying Moroccan Dirhams (MAD) in cash is very useful for Medina souks, local food stalls, taxis, and tips, where card machines are rarely available. ATMs are easily found near major gates.',
      fr: 'Oui, les espèces en dirhams (MAD) sont indispensables pour les petits achats, les marchés, les taxis et les pourboires dans la médina.',
      ar: 'نعم بالتأكيد، حمل النقود بالدرهم المغربي ضروري للدفع في دكاكين فاس البالي، أكلات الشارع، التاكسي، والإكراميات حيث لا تتوفر أجهزة بطاقات الدفع في معظم المحلات الشعبية.',
    },
  },
];

// 7. DEFAULT BLOG & IN-DEPTH ARTICLES
export const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-food-tasting',
    slug: 'taste-fez-through-local-eyes',
    title: {
      en: 'Taste Fez Through Local Eyes: An Alley Safari of Street Food & Living Traditions',
      fr: 'Goûtez Fès à travers des yeux locaux : safari gourmand dans la médina',
      ar: 'تذوق فاس بعيون أبنائها: جولة بين أكلات الشارع والتقاليد الحية',
    },
    excerpt: {
      en: 'To understand Fez, you should taste it. From morning Harcha and honey Baghrir to piping-hot Bissara and neighborhood bakeries.',
      fr: 'Pour comprendre Fès, il faut la goûter ! De la Harcha matinale à la Bissara fumante et aux fours de quartier.',
      ar: 'لفهم فاس الحقيقية تذوق طعامها: من حرشة الصباح وبغرير العسل إلى حساء البيصارة الساخن وأفران الحومة الشعبية.',
    },
    content: {
      en: `Food in Fez is part of everyday life. It is found in small shops, bakeries, market stalls, traditional food places and family kitchens. It is the smell of bread coming from an oven, the sound of people ordering breakfast, the colours of spices in the market, a glass of Moroccan tea shared during a conversation, and small foods that people enjoy throughout the day.

Our food tasting walk takes you into this everyday side of the Medina. This is not simply a tour where you sit down for one large meal; we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets and local products while learning how they are connected to life in Fez.

Taste warm Harcha, honeycomb Baghrir, spicy Sfenj, freshly pressed olive oil, and steaming bowls of Bissara seasoned with cumin. Come hungry and leave with a true taste of Fez!`,
      fr: `La gastronomie fassie se découvre dans les petites échoppes et les fours communaux. Rejoignez-nous pour une balade sensorielle à travers les saveurs authentiques de la médina.`,
      ar: `الطعام في فاس أسلوب حياة ونبض يومي؛ لا تكتمل زيارة المدينة دون تذوق أطباقها الشعبية في دكاكينها الأصلية المليئة برائحة الخبز الطازج وزيت الزيتون والشاي المعطر بالأعشاب.`
    },
    coverImage: '/src/assets/images/real/food_tasting_walk_image1.jpg',
    category: { en: 'Food & Culinary', fr: 'Gastronomie', ar: 'المطبخ والتذوق' },
    author: 'Med — FezGuideTours',
    date: '2026-09-28',
    readTime: { en: '4 min read', fr: '4 min de lecture', ar: '4 دقائق' },
    published: true,
  },
  {
    id: 'post-chefchaouen-daytrip',
    slug: 'chefchaouen-day-trip-guide',
    title: {
      en: 'Chefchaouen Day Trip: The Blue Pearl of Northern Morocco',
      fr: 'Excursion à Chefchaouen : La Perle Bleue du Nord du Maroc',
      ar: 'دليل رحلة شفشاون: أسرار اللؤلؤة الزرقاء في جبال الريف',
    },
    excerpt: {
      en: 'Spend a day discovering Chefchaouen: blue-painted alleys, Plaza Uta el-Hammam, the Kasbah, and the mountain spring of Ras El Maa.',
      fr: 'Une journée magique à Chefchaouen entre ruelles azurées, Kasbah historique et cascades de Ras El Maa.',
      ar: 'اقضِ يوماً لا يُنسى في شفشاون: الدروب الزرقاء الخلابة، ساحة وطاء الحمام، القصبة الأثرية ومنبع رأس الماء.',
    },
    content: {
      en: `Spend a day discovering Chefchaouen, the famous Blue City of northern Morocco, surrounded by the Rif Mountains.

After leaving Fez in a comfortable private vehicle, the journey takes you through rolling Moroccan countryside before climbing into the Rif Mountains. Once in Chefchaouen, walk through the old town where blue-painted walls and traditional houses create an extraordinary atmosphere.

Sit for a glass of Moroccan mint tea at Plaza Uta el-Hammam, visit the historic Kasbah, walk towards the mountain spring of Ras El Maa, and enjoy local handicrafts at your own relaxed pace.`,
      fr: `Partez de Fès pour une échappée montagnarde inoubliable vers la féerique cité bleue de Chefchaouen.`,
      ar: `رحلة رائعة من فاس نحو جبال الريف لاكتشاف مدينة شفشاون الشهيرة بزرقتها الساحرة وأجوائها الجبلية الهادئة والمميزة.`
    },
    coverImage: '/src/assets/images/real/daytrip_chefchaouen_image1.jpg',
    category: { en: 'Day Trips', fr: 'Excursions', ar: 'رحلات واستكشاف' },
    author: 'Med — FezGuideTours',
    date: '2026-09-29',
    readTime: { en: '5 min read', fr: '5 min de lecture', ar: '5 دقائق' },
    published: true,
  },
  {
    id: 'post-getting-around-fez',
    slug: 'getting-around-fez-medina-gates-taxis',
    title: {
      en: 'Getting Around Fez: Walking, Medina Gates & Red Petit Taxis',
      fr: 'Se Déplacer à Fès : Rues Piétonnes, Portes & Taxis Rouges',
      ar: 'دليل التنقل في فاس: المشي، بوابات المدينة والتاكسي الأحمر',
    },
    excerpt: {
      en: 'Everything you need to know about navigating the pedestrian Old Medina and using red Petit Taxis (10–20 MAD) with ease.',
      fr: 'Tout ce qu’il faut savoir pour se déplacer facilement entre la médina piétonne et la Ville Nouvelle.',
      ar: 'كل ما تحتاج معرفته عن التنقل داخل فاس البالي الخالية من السيارات وكيفية ركوب التاكسي الصغير بسهولة.',
    },
    content: {
      en: `Getting around Fez is different from moving around a modern city. The Old Medina was built around walking, with narrow streets and pedestrian passages. Outside the Medina, red Petit Taxis are convenient, metered, and typically cost 10–20 MAD for local trips.

Remember key gate names like Bab Boujloud, Bab Rcif, and Batha to make your pickup and drop-off effortless!`,
      fr: `Comprenez les portes clés de la médina et le fonctionnement des petits taxis rouges pour vous déplacer comme un habitant.`,
      ar: `تعرف على أهم أبواب فاس العتيقة وطريقة التعامل مع سيارات الأجرة الحمراء لتتنقل في المدينة بكل ثقة وراحة.`
    },
    coverImage: '/src/assets/images/real/tips_getting_around_image1.jpg',
    category: { en: 'Travel Tips', fr: 'Conseils Voyage', ar: 'نصائح السفر' },
    author: 'Med — FezGuideTours',
    date: '2026-09-30',
    readTime: { en: '3 min read', fr: '3 min de lecture', ar: '3 دقائق' },
    published: true,
  },
];

// 8. DEFAULT SITE SETTINGS
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'FezGuideTours',
  phoneNumber: '+212 719-603009',
  whatsappNumber: '212719603009',
  email: 'fezguidetours1@gmail.com',
  address: {
    en: 'Bab Boujloud, Medina of Fez, 30110 Morocco',
    fr: 'Bab Boujloud, Médina de Fès, 30110 Maroc',
    ar: 'باب بوجلود، فاس البالي، 30110 المغرب',
  },
  licenseBadge: {
    en: 'Local Native Hosts & Certified Medina Guides',
    fr: 'Hôtes Natifs & Guides Locaux Agréés',
    ar: 'فريق محلي من أبناء فاس ومرشدون معتمدون',
  },
  heroTagline: {
    en: 'Fez Guide Tours — Discover the City Through Local Eyes',
    fr: 'Fez Guide Tours — Découvrez la Ville à Travers des Yeux Locaux',
    ar: 'فاس جايد تورز — اكتشف فاس بعيون أبنائها المحليين',
  },
  heroTitle: {
    en: 'Discover Fez in a Simple, Comfortable and Personal Way',
    fr: 'Découvrez Fès de Manière Simple, Confortable et Personnelle',
    ar: 'اكتشف فاس بطريقة بسيطة، مريحة وتجربة خاصة بك',
  },
  heroSubtitle: {
    en: 'We know the streets of the Medina, the local food, living traditions and everyday life. Private walking tours, food tastings, and relaxed day trips beyond the city.',
    fr: 'Nous connaissons les ruelles de la Médina, les saveurs locales, les traditions vivantes et le quotidien. Balades guidées privées, dégustations et excursions.',
    ar: 'نعرف دروب فاس البالي، مأكولاتنا الشعبية الأصيلة، تقاليدنا وتفاصيل الحياة اليومية. جولات خاصة مشياً على الأقدام، رحلات تذوق، ورحلات يومية مريحة.',
  },
  heroImage: '/images/real/about_us_image7.jpg',
  socialInstagram: 'https://instagram.com/fezguidetours',
  socialFacebook: 'https://facebook.com/fezguidetours',
  socialTripadvisor: 'https://www.tripadvisor.com/Attraction_Review-g293733-d33349838-Reviews-Fez_Guide_Tours-Fez_Fez_Meknes.html',
  googleMaps: 'https://maps.app.goo.gl/5aXiAV7FjS1W3qBj6',
};

// 9. DEFAULT CUSTOM PAGES
export const DEFAULT_CUSTOM_PAGES: CustomPage[] = [
  {
    id: 'page-bespoke-itinerary',
    slug: 'bespoke-morocco-experiences',
    title: {
      en: 'Bespoke Private Journeys from Fez',
      fr: 'Voyages Sur Mesure au départ de Fès',
      ar: 'رحلات خاصة مصممة حسب الطلب من فاس',
    },
    subtitle: {
      en: 'Tailor-Made Multiday Routes & Specialized Cultural Visits',
      fr: 'Circuits personnalisés de plusieurs jours et visites thématiques',
      ar: 'مسارات متعددة الأيام وبرامج ثقافية مخصصة حسب رغبتكم',
    },
    heroImage: '/src/assets/images/real/daytrip_custom_image1.jpg',
    content: {
      en: `Have a specific interest or need multi-day arrangements starting from Fez? We organize custom private experiences tailored around your travel style. Whether you wish to explore the Middle Atlas, visit artisan ceramics workshops, take part in an authentic cooking class in a Medina home, or journey south toward the desert, we coordinate every detail with trusted local partners.`,
      fr: `Vous avez un projet de voyage particulier ? Nous créons des circuits sur mesure au départ de Fès avec véhicules privés confortables et accompagnement local de confiance.`,
      ar: `هل ترغب في برنامج سياحي خاص أو رحلة متعددة الأيام انطلاقاً من فاس؟ نقوم بتنسيق وتصميم رحلات متكاملة تناسب اهتماماتكم مع سيارات مريحة ومرشدين محليين موثوقين.`
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
      ar: [
        'تخطيط مسارات خاصة بالتشاور المباشر مع المؤسس وفريق العمل',
        'سيارات سياحية حديثة ومكيفة مع سائقين محترفين مخصصين لكم',
        'تجارب حية وأصيلة (دروس طبخ منزلي، زيارات ورشات الحرفيين الكبار)',
        'مرونة تامة تناسب العائلات والأزواج والمسافرين المستقلين'
      ]
    },
    showInNav: false,
    published: true,
    createdAt: '2026-10-01',
  },
];
