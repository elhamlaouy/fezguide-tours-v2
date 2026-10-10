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
          ar: 'باب بوجلود (البوابة الزرقاء) والطلعة الكبيرة',
        },
        description: {
          en: 'Meet your licensed native guide under the cobalt blue arches of Bab Boujloud. Begin descending Tala’a Kbira, the vibrant historic spine of Fes el-Bali.',
          fr: 'Retrouvez votre guide officiel sous les superbes faïences bleues de Bab Boujloud. Descente de Tala’a Kbira, l’artère médiévale emblématique.',
          ar: 'اللقاء بالمرشد المعتمد أمام باب بوجلود التاريخي، ثم الانطلاق عبر الطلعة الكبيرة، الشريان التراثي النابض لفاس البالي.',
        },
        badge: { en: 'Historic Gateway', fr: 'Porte Emblématique', ar: 'بوابة تاريخية' },
      },
      {
        time: '10:30 AM',
        title: {
          en: 'Bou Inania Madrasa & Water Clock (Dar al-Magana)',
          fr: 'Médersa Bou Inania & Horloge Hydraulique',
          ar: 'المدرسة البوعنانية ودار المگانة المائية',
        },
        description: {
          en: 'Explore the 14th-century Marinid architectural masterpiece with its intricate stucco, carved cedarwood, and hand-cut geometric zellige tiles.',
          fr: 'Découverte de ce chef-d’œuvre mérinide du XIVe siècle, orné de stucs délicats, de bois de cèdre sculpté et de zelliges géométriques.',
          ar: 'زيارة التحفة المعمارية المرينية التي شيدت في القرن الرابع عشر، وتأمل نقوش الجبس وخشب الأرز والزليج الفاسي النادر.',
        },
        badge: { en: 'Architecture', fr: 'Architecture', ar: 'عمارة إسلامية' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Living Craftsmen Quarters & Hidden Workshops',
          fr: 'Quartiers des Métiers & Ateliers Vivants',
          ar: 'أحياء الحرفيين والورشات التقليدية الحية',
        },
        description: {
          en: 'Venture into the heart of the artisan guilds: copper beating in Place Seffarine, loom weaving of agave cactus silk, and master woodworking.',
          fr: 'Immersion au cœur des corporations d’artisans : dinandiers de la place Seffarine, tisserands de soie végétale et ébénistes.',
          ar: 'دخول دروب الحرفيين: نحاسيو ساحة الصفارين، نساجو حرير الصبار البلدي، وورشات النجارة التقليدية العريقة.',
        },
        badge: { en: 'Artisans', fr: 'Artisans', ar: 'حرف تقليدية' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Chouara Tannery & Leather Heritage',
          fr: 'Tannerie Chouara & Savoir-Faire du Cuir',
          ar: 'دار الدباغ شوارة وتاريخ صناعة الجلد',
        },
        description: {
          en: 'View the world-famous natural stone dye vats from a terrace with fresh mint. Learn the medieval tanning process preserved unchanged since the 11th century.',
          fr: 'Vue panoramique sur les fosses de teinture naturelle du XIe siècle avec un brin de menthe fraîche et explications détaillées.',
          ar: 'مشاهدة أحواض الصباغة الحجرية الشهيرة عالمياً مع باقة نعناع فريش، وشرح دقيق لمراحل الدباغة الطبيعية المستمرة منذ القرن الحادي عشر.',
        },
        badge: { en: 'World Famous', fr: 'Incontournable', ar: 'تراث عالمي' },
      },
      {
        time: '02:00 PM',
        title: {
          en: 'Panoramic Rooftop Lookout & Fresh Mint Tea',
          fr: 'Panorama sur les Toits & Pause Thé à la Menthe',
          ar: 'مطل بانورامي على مآذن فاس واستراحة شاي بالنعناع',
        },
        description: {
          en: 'Conclude your walk at a quiet historic rooftop terrace overlooking the sea of minarets and medieval rooftops, sharing local tea and conversation.',
          fr: 'Terminez votre balade sur un toit-terrasse paisible offrant une vue saisissante sur les minarets et toitures médiévales.',
          ar: 'ختام الجولة في شرفة بانورامية تطل على مآذن فاس البالي وتلالها المحيطة، مع جلسة شاي مغربي هادئة وتجاذب أطراف الحديث.',
        },
        badge: { en: 'Panoramic View', fr: 'Vue Panoramique', ar: 'إطلالة ساحرة' },
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
      ar: [
        'مرشد سياحي رسمي معتمد من وزارة السياحة من أبناء فاس العتيقة',
        'جولة خاصة 100% لك ولمجموعتك فقط بدون أي أفواج مجهولة',
        'اللقاء والتوصيل من مقر إقامتك بالرياض أو فندقك قرب المدينة العتيقة',
        'وتيرة مشي مرنة ومريحة تناسب العائلات وهواة التصوير',
        'استراحة شاي بالنعناع المغربي الأصيل في شرفة بانورامية ساحرة',
        'مصداقية كاملة: لا عمولات خفية ولا إجبار على دخول محلات التسوق',
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
      ar: [
        'تذاكر دخول المعالم التاريخية (المدرسة البوعنانية ~20 درهم)',
        'وجبة الغداء (يوفر المرشد أفضل الترشيحات المحلية للمطاعم النظيفة)',
        'المشتريات والمقتنيات الشخصية',
        'الإكرامية الاختيارية للمرشد',
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
      ar: [
        'حذاء مشي مريح ومانع للانزلاق لملاءمة الأزقة الحجرية والدرجات',
        'واقي شمس: نظارات شمسية وقبعة خفيفة',
        'كاميرا أو هاتف محمول لتوثيق المشاهد النادرة والتفاصيل المعمارية',
        'مبلغ نقدي بالدرهم المغربي (MAD) للدخوليات والمشروبات الخفيفة',
        'ملابس محتشمة ومريحة تناسب طابع المدينة العتيقة',
      ],
    },
    meetingPointDetails: {
      en: 'Direct pickup at your Riad or Hotel inside or adjacent to the Medina, or at the landmark monument Bab Boujloud (outside Café Clock).',
      fr: 'Prise en charge à votre Riad ou hôtel dans la Médina, ou devant la grande porte Bab Boujloud.',
      ar: 'التوصيل المباشر من باب الرياض أو الفندق، أو نقطة الالتقاء الرسمية أمام باب بوجلود التاريخي.',
    },
    cancellationPolicy: {
      en: 'Free cancellation with 100% refund up to 24 hours prior to tour departure.',
      fr: 'Annulation gratuite avec remboursement intégral jusqu’à 24 heures avant le départ.',
      ar: 'إلغاء مجاني مع استرداد كامل للمبلغ حتى 24 ساعة قبل موعد بدء الجولة.',
    },
    suitableFor: {
      en: ['Couples & Solos', 'Families with Children', 'Photography Enthusiasts', 'First-Time Morocco Visitors'],
      fr: ['Couples & Voyageurs solos', 'Familles avec enfants', 'Passionnés de photographie', 'Premier voyage au Maroc'],
      ar: ['الأزواج والمسافرون المنفردون', 'العائلات مع أطفال', 'عشاق التصوير', 'القادمون للمغرب لأول مرة'],
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
          ar: 'حجز هذه الجولة مع ميد كان أفضل قرار اتخذناه في رحلتنا إلى المغرب. شرحه لتاريخ فاس وأزقتها وفتح أبواب الورشات الحقيقية جعل الرحلة تجربة لا تُنسى!',
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
          ar: 'انغماس ثقافي وتاريخي عميق. لا ضغط ولا محلات تسوق مفروضة، فقط تاريخ حقيقي ولقاءات إنسانية طيبة في دروب فاس. أنصح بها بشدة.',
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
          ar: 'القصر الملكي بفاس (دار المخزن) وأبوابه الذهبية',
        },
        description: {
          en: 'Admire the monumental 7 bronze gates of the Royal Palace, adorned with hand-chiseled brass arabesques and zellige mosaic patterns.',
          fr: 'Contemplez les 7 majestueuses portes en bronze ciselé du Palais Royal et leurs décors de faïence zellige éclatants.',
          ar: 'التوقف أمام الأبواب النحاسية السبعة المنقوشة يدوياً للقصر الملكي، وتأمل لوحات الزليج الهندسي البديع.',
        },
        badge: { en: 'Royal Splendor', fr: 'Splendeur Royale', ar: 'هيبة ملكية' },
      },
      {
        time: '10:00 AM',
        title: {
          en: 'The Historic Jewish Mellah & Ibn Danan Synagogue',
          fr: 'Le Mellah Historique & Synagogue Ibn Danan',
          ar: 'حي الملاح التاريخي وكنيس ابن دانان العتيق',
        },
        description: {
          en: 'Walk the distinctive wrought-iron balcony streets of the Mellah, visiting the 17th-century restored Ibn Danan Synagogue and Jewish cemetery.',
          fr: 'Parcourez les ruelles aux balcons en fer forgé du Mellah, visitez la synagogue du XVIIe siècle et le cimetière israélite.',
          ar: 'جولة في شوارع الملاح ذات الشرفات الحديدية الأندلسية، وزيارة كنيس ابن دانان الأثري الذي شيد في القرن السابع عشر.',
        },
        badge: { en: 'Shared Heritage', fr: 'Mémoire Partagée', ar: 'تراث مشترك' },
      },
      {
        time: '11:15 AM',
        title: {
          en: 'Al-Qarawiyyin University & Historic Quarter',
          fr: 'Université Al Quaraouiyine & Quartier Historique',
          ar: 'جامعة القرويين التاريخية ومكتبتها العريقة',
        },
        description: {
          en: 'Founded in 859 AD by Fatima al-Fihri, recognized by UNESCO as the oldest existing educational institution in the world.',
          fr: 'Fondée en 859 par Fatima al-Fihri, reconnue par l’UNESCO comme la plus ancienne université au monde encore en activité.',
          ar: 'تأسست عام 859م على يد فاطمة الفهرية، وهي أقدم مؤسسة للتعليم العالي المستمر في العالم بشهادة اليونسكو.',
        },
        badge: { en: 'UNESCO Legacy', fr: 'Patrimoine UNESCO', ar: 'أقدم جامعة بالعالم' },
      },
      {
        time: '12:30 PM',
        title: {
          en: 'Al-Attarine Madrasa & Nejjarine Wood Museum',
          fr: 'Médersa Al-Attarine & Musée Nejjarine du Bois',
          ar: 'مدرسة العطارين ومتحف النجارين لفنون الخشب',
        },
        description: {
          en: 'Discover the pinnacles of Islamic calligraphy, cedar carving, and the grand restored 18th-century fondouk in Place Nejjarine.',
          fr: 'Découvrez les sommets de la calligraphie islamique et l’ancien fondouk caravanier du XVIIIe siècle magnifiquement restauré.',
          ar: 'اكتشاف أروع ما أبدعته اليد المغربية في فن الخط الكوفي، ونقش خشب الأرز، وزيارة فندق النجارين التراثي التاريخي.',
        },
        badge: { en: 'Masterpieces', fr: 'Chefs-d’œuvre', ar: 'إبداع معماري' },
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
      ar: [
        'مرشد ومؤرخ معتمد متخصص في تاريخ فاس الإسلامي والأندلسي',
        'جولة خاصة 100% مصممة حسب اهتمامك التاريخي والمعماري',
        'نقل خاص ومريح بين القصر الملكي والملاح ومدخل فاس البالي',
        'شرح موثق لأسرار الهندسة الإسلامية والزخارف الأندلسية والتراث المشترك',
        'مياه معدنية معبأة طوال الجولة',
      ],
    },
    excluded: {
      en: ['Monument entrance fees (~20 to 50 MAD per site)', 'Lunch & personal expenses', 'Guide gratuity'],
      fr: ['Entrées aux monuments (~20 à 50 MAD par site)', 'Déjeuner & dépenses personnelles', 'Pourboire'],
      ar: ['تذاكر دخول المدارس والمتاحف (~20 إلى 50 درهم للمعلم)', 'وجبة الغداء والمصاريف الشخصية', 'إكرامية المرشد'],
    },
    whatToBring: {
      en: ['Walking shoes', 'Camera with zoom lens', 'Cash in MAD', 'Scarf for visits near sacred sites'],
      fr: ['Chaussures confortables', 'Appareil photo', 'Dirhams en espèces', 'Foulard léger'],
      ar: ['حذاء مريح', 'كاميرا بعدسة جيدة', 'مبلغ نقدي بالدرهم', 'وشاح خفيف'],
    },
    meetingPointDetails: {
      en: 'Riad/Hotel pickup in Fez or Royal Palace Bab Dekkakin meeting point.',
      fr: 'Prise en charge à votre hébergement ou devant Bab Dekkakin.',
      ar: 'التوصيل من مقر إقامتك أو اللقاء عند باب الدكاكين بالقصر الملكي.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours in advance.',
      fr: 'Annulation gratuite jusqu’à 24h avant l’activité.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['History Buffs', 'Architecture Lovers', 'Academics & Cultural Travelers', 'Families'],
      fr: ['Amateurs d’histoire', 'Passionnés d’architecture', 'Voyageurs culturels', 'Familles'],
      ar: ['عشاق التاريخ', 'محبو العمارة الإسلامية', 'الباحثون والمهتمون بالتراث', 'العائلات'],
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
          ar: 'مرشدنا كان موسوعة تاريخية حية. الربط بين الملاح وتاريخ الملوك المرينيين وجامعة القرويين كان ساحراً وممتعاً جداً.',
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
          ar: 'ورشة الخزف والزليج الفاسي: عرض حي وحرفي',
        },
        description: {
          en: 'Watch artisans knead grey clay from the local hills, spin potter’s wheels with their feet, and chip intricate zellige mosaic tesserae by hand with a heavy hammer.',
          fr: 'Observez les potiers façonner l’argile grise au tour et les maîtres artisans tailler les fragments de zellige avec leur marteau traditionnel.',
          ar: 'مشاهدة حرفيي الفخار وهم يعجنون طين فاس الرمادي ويشكلون الأواني بأرجلهم، ثم تقطيع قطع الزليج الدقيقة يدوياً بالمنقاش.',
        },
        badge: { en: 'Handmade Craft', fr: 'Artisanat d’Art', ar: 'صناعة يدوية' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Souk el-Attarine: Spices, Herbs & Pure Argan',
          fr: 'Souk el-Attarine : Épices, Plantes & Huile d’Argan Pure',
          ar: 'سوق العطارين: التوابل، الأعشاب الطبيعية، والأركان الأصلي',
        },
        description: {
          en: 'Immerse your senses in cones of saffron, paprika, cumin, amber resin, and rosewater. Learn how locals use medicinal herbs in daily life.',
          fr: 'Éveillez vos sens devant les pyramides de safran, cumin, résines d’ambre et eau de rose distillée.',
          ar: 'تأمل تلال الزعفران، الكمون، ماء الورد المقطر، والصمغ العربي، واكتشف أسرار استخدام الأعشاب في المطبخ والطب الشعبي.',
        },
        badge: { en: 'Sensory Souk', fr: 'Souk des Épices', ar: 'سوق التوابل' },
      },
      {
        time: '01:15 PM',
        title: {
          en: 'Seffarine Brass & Copper Coppersmithing',
          fr: 'Place Seffarine : Dinanderie & Cuivre Martelé',
          ar: 'ساحة الصفارين: فن طرق النحاس وصناعة الصواني',
        },
        description: {
          en: 'The rhythmic music of coppersmiths hammering giant couscous steamers, teapots, and ornate brass trays under the shade of ancient plane trees.',
          fr: 'Le tintement mélodieux des marteaux forgeant les théières, chaudrons à couscous et plateaux en cuivre ciselé.',
          ar: 'إيقاع مطارق النحاسيين العريقة في ساحة الصفارين تحت ظلال الأشجار المعمرة، وصناعة صواني الشاي وأواني الكسكس الضخمة.',
        },
        badge: { en: 'Living Sound', fr: 'Ambiance Vivante', ar: 'إيقاع تراثي' },
      },
      {
        time: '05:30 PM',
        title: {
          en: 'Sunset at Merenid Tombs & Borj Nord Overlook',
          fr: 'Coucher de Soleil aux Tombeaux Mérinides & Borj Nord',
          ar: 'غروب الشمس الساحر من القلاع المرينية وبرج الشمال',
        },
        description: {
          en: 'End the day with a dramatic golden hour view watching the call to prayer echo across the 10,000 rooftops of the medieval Medina.',
          fr: 'Clôturez la journée avec un coucher de soleil grandiose alors que l’appel à la prière résonne sur les toits de la médina.',
          ar: 'اختتام اليوم بمشهد غروب الشمس الذهبي وسماع صدى أذان المغرب يتردد في أرجاء آلاف المآذن والدروب العتيقة.',
        },
        badge: { en: 'Golden Hour', fr: 'Coucher de Soleil', ar: 'لحظة الغروب' },
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
      ar: [
        'مرشد رسمي معتمد يرافقك طوال البرنامج',
        'نقل خاص ومريح لورش الخزف والمطلات البانورامية العالية',
        'عروض حية لصناعة الفخار، الزليج، النسيج، وطرق النحاس',
        'إرشادات أمينة لتمييز المنتجات اليدوية الأصلية والأسعار العادلة',
      ],
    },
    excluded: {
      en: ['Personal purchases', 'Meals and drinks', 'Tips for artisans & guide'],
      fr: ['Achats personnels', 'Repas et consommations', 'Pourboires'],
      ar: ['المشتريات الشخصية', 'الوجبات والمشروبات', 'الإكراميات'],
    },
    whatToBring: {
      en: ['Flat comfortable shoes', 'Tote bag for souvenirs', 'Cash for shopping', 'Camera'],
      fr: ['Chaussures plates confortables', 'Sac pour emplettes', 'Espèces', 'Appareil photo'],
      ar: ['حذاء مريح', 'حقيبة تسوق قماشية', 'مبلغ نقدي', 'كاميرا للتصوير'],
    },
    meetingPointDetails: {
      en: 'Pickup from your Riad or centrally located hotel in Fez.',
      fr: 'Prise en charge à votre riad ou hôtel à Fès.',
      ar: 'التوصيل من مقر إقامتك بالرياض أو الفندق في فاس.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to experience.',
      fr: 'Annulation gratuite jusqu’à 24 heures avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['Shoppers & Craft Lovers', 'Families', 'Design & Art Enthusiasts', 'Couples'],
      fr: ['Amateurs d’artisanat', 'Familles', 'Passionnés de design', 'Couples'],
      ar: ['محبو الحرف والتسوق التراثي', 'العائلات', 'عشاق الفنون والديكور', 'الأزواج'],
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
          ar: 'مشاهدة معلمي الزليج يجمعون القطع الصغيرة كان سحراً حقيقياً، وغروب الشمس من القلاع المرينية مشهد يحبس الأنفاس!',
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
          ar: 'الانطلاق من فاس وعبر جبال الريف الخضراء',
        },
        description: {
          en: 'Your private air-conditioned vehicle picks you up at your Riad. Enjoy a scenic 3.5-hour journey through olive groves, dams, and Rif mountain passes with coffee stops.',
          fr: 'Prise en charge à votre Riad en véhicule moderne climatisé. Magnifique trajet de 3h30 à travers les paysages du Rif avec pauses café.',
          ar: 'الانطلاق بسيارة حديثة ومكيفة من مقر إقامتك، والاستمتاع برحلة بانورامية عبر حقول الزيتون وسدود المياه وجبال الريف.',
        },
        badge: { en: 'Scenic Drive', fr: 'Route Panoramique', ar: 'طريق جبلي ساحر' },
      },
      {
        time: '11:45 AM',
        title: {
          en: 'Arrival at Chefchaouen & Outa el-Hammam Square',
          fr: 'Arrivée à Chefchaouen & Place Outa el-Hammam',
          ar: 'الوصول إلى شفشاون وساحة وطاء الحمام',
        },
        description: {
          en: 'Step into the tranquil blue pearl of Morocco. Explore the central plaza surrounded by red-walled Kasbah towers, cafes, and cedar-shaded patios.',
          fr: 'Entrez dans la perle bleue du Maroc. Découvrez la place centrale entourée de la Kasbah aux murs ocre et de terrasses ombragées.',
          ar: 'دخول الجوهرة الزرقاء الساحرة، واستكشاف ساحة وطاء الحمام المركزية المحاطة بأسوار القصبة الحمراء ومقاهي الشاي الجبلي.',
        },
        badge: { en: 'Blue Pearl', fr: 'Perle Bleue', ar: 'الجوهرة الزرقاء' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Exploring the Blue Alleys & Ras El Maa',
          fr: 'Balade dans les Ruelles Bleues & Source Ras el-Maa',
          ar: 'التجول بين الدروب الزرقاء ومنبع رأس الماء',
        },
        description: {
          en: 'Stroll the famous cobalt-washed stairways, discover Berber wool blankets, and walk to the fresh mountain spring of Ras el-Maa where locals gather.',
          fr: 'Flânez dans les ruelles peintes de nuances d’azur, découvrez les tissages rifains et rejoignez la fraîcheur de la source Ras el-Maa.',
          ar: 'المشي في الأزقة والسلالم الزرقاء الشهيرة، واكتشاف منسوجات صوف جبال الريف، والوصول إلى منبع شلالات رأس الماء البارد.',
        },
        badge: { en: 'Pure Magic', fr: 'Magie Pure', ar: 'طبيعة عذبة' },
      },
      {
        time: '04:30 PM',
        title: {
          en: 'Relaxed Return Journey to Fez',
          fr: 'Retour Confortable vers Fès',
          ar: 'رحلة العودة المريحة إلى فاس',
        },
        description: {
          en: 'Relax in your private vehicle during the comfortable drive back, arriving at your Fez accommodation around 7:30 PM.',
          fr: 'Trajet retour détendu en véhicule privé, arrivée à votre hébergement à Fès vers 19h30.',
          ar: 'العودة بكل راحة في سيارتك الخاصة، والوصول إلى فندقك في فاس حوالي الساعة 7:30 مساءً.',
        },
        badge: { en: 'Comfort Return', fr: 'Retour Confort', ar: 'عودة مريحة' },
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
      ar: [
        'سيارة سياحية خاصة وحديثة ومكيفة لك ولمجموعتك فقط',
        'سائق محترف وموثوق ومرخص يتحدث العربية والإنجليزية والفرنسية',
        'توصيل مباشر من باب الرياض في فاس والعودة إليه',
        'شامل الوقود، رسوم الطرق السريعة، ومواقف السيارات بالكامل',
        'حرية كاملة: التوقف متى رغبتم لالتقاط الصور والتمتع بالمناظر الجبلية',
      ],
    },
    excluded: {
      en: ['Lunch & personal beverages in Chefchaouen', 'Local town guide (optional add-on ~250 MAD)', 'Driver tip'],
      fr: ['Déjeuner et boissons à Chefchaouen', 'Guide local de ville (optionnel ~250 MAD)', 'Pourboire chauffeur'],
      ar: ['وجبة الغداء والمشروبات في شفشاون', 'مرشد محلي داخل المدينة (اختياري إضافي ~250 درهم)', 'إكرامية السائق'],
    },
    whatToBring: {
      en: ['Comfortable walking footwear for hilly cobblestones', 'Camera & charged power bank', 'Light jacket for mountain breezes', 'Cash in MAD'],
      fr: ['Chaussures confortables pour les ruelles en pente', 'Appareil photo & batterie', 'Veste légère', 'Espèces en MAD'],
      ar: ['حذاء مشي مريح للدروب الجبلية والسلالم', 'كاميرا وشاحن متنقل', 'سترة خفيفة لنسيم الجبال', 'مبلغ نقدي بالدرهم'],
    },
    meetingPointDetails: {
      en: 'Door-to-door pickup at any Riad, hotel, or private villa in Fez at 08:00 AM.',
      fr: 'Prise en charge directement à votre hébergement à Fès à 08h00.',
      ar: 'التوصيل من باب الفندق أو الرياض في فاس عند الساعة 08:00 صباحاً.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before pickup.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل موعد الانطلاق.',
    },
    suitableFor: {
      en: ['Couples', 'Families', 'Photographers & Instagrammers', 'Small Groups of Friends'],
      fr: ['Couples', 'Familles', 'Photographes', 'Petits groupes d’amis'],
      ar: ['الأزواج', 'العائلات', 'عشاق الصور والجمال الطبيعي', 'المجموعات والأصدقاء'],
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
          ar: 'السائق كان في قمة اللباقة والسيارة نظيفة جداً، والرحلة الخاصة منحتنا حرية كاملة للتجول والتصوير بدون استعجال الباصات السياحية.',
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
          ar: 'وليلي',
        },
        description: {
          en: 'Walk among the remains of the ancient Roman city, its old streets and buildings, and the mosaics that have survived for centuries.',
          fr: 'Marchez parmi les vestiges de la cité romaine, ses anciennes rues, ses bâtiments et les mosaïques qui ont traversé les siècles.',
          ar: 'تجولوا بين بقايا المدينة الرومانية وشوارعها ومبانيها القديمة والفسيفساء التي صمدت لقرون.',
        },
        badge: { en: 'Roman Heritage', fr: 'Antiquité Romaine', ar: 'تراث روماني' },
      },
      {
        time: '',
        title: {
          en: 'Moulay Idriss Zerhoun',
          fr: 'Moulay Idriss Zerhoun',
          ar: 'مولاي إدريس زرهون',
        },
        description: {
          en: 'A small hillside pilgrimage town. Walk part of it, look at the views, and see its link to the early history of Morocco.',
          fr: 'Une petite ville sainte sur les collines. Parcourez-en une partie, profitez des vues et découvrez son lien avec les débuts de l’histoire du Maroc.',
          ar: 'بلدة حج صغيرة على التلال. امشوا في جزء منها، شاهدوا الإطلالات، واكتشفوا صلتها ببدايات تاريخ المغرب.',
        },
        badge: { en: 'Holy Town', fr: 'Cité Sainte', ar: 'بلدة تاريخية' },
      },
      {
        time: '',
        title: {
          en: 'Meknes: Bab Mansour and the old medina',
          fr: 'Meknès : Bab Mansour et l’ancienne médina',
          ar: 'مكناس: باب المنصور والمدينة العتيقة',
        },
        description: {
          en: 'Walk around Bab Mansour, the old medina, historic walls and traditional streets. If the sites are open, there is also time for more of Meknes from the period of Sultan Moulay Ismail.',
          fr: 'Faites le tour de Bab Mansour, de l’ancienne médina, des remparts et des rues traditionnelles. Si les sites sont ouverts, il reste aussi du temps pour d’autres lieux de Meknès liés à l’époque du sultan Moulay Ismaïl.',
          ar: 'تجولوا حول باب المنصور والمدينة العتيقة والأسوار التاريخية والشوارع التقليدية. إذا كانت المواقع مفتوحة، هناك أيضاً وقت لمزيد من مكناس في فترة السلطان مولاي إسماعيل.',
        },
        badge: { en: 'Imperial Capital', fr: 'Capitale Impériale', ar: 'عاصمة إسماعيلية' },
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
      ar: [
        'سيارة سياحية خاصة ومكيفة مع سائق محترف وخبير بالطرق',
        'توصيل من وإلى مقر إقامتك بالرياض أو الفندق في فاس',
        'شامل جميع تكاليف المحروقات والرسوم والمواقف',
        'برنامج مرن يتيح لك قضاء الوقت المناسب في كل معلم أثري',
      ],
    },
    excluded: {
      en: ['Volubilis entrance ticket (~70 MAD)', 'Local site guide at Volubilis (optional ~200 MAD)', 'Lunch'],
      fr: ['Billet d’entrée à Volubilis (~70 MAD)', 'Guide officiel à Volubilis (optionnel ~200 MAD)', 'Déjeuner'],
      ar: ['تذكرة دخول موقع وليلي الأثري (~70 درهم)', 'مرشد محلي خاص بوليلي (اختياري ~200 درهم)', 'الغداء'],
    },
    whatToBring: {
      en: ['Sun hat and sunglasses (open archaeological ruins)', 'Comfortable walking sneakers', 'Camera', 'Cash in MAD'],
      fr: ['Chapeau et lunettes de soleil', 'Chaussures de marche', 'Appareil photo', 'Dirhams en espèces'],
      ar: ['قبعة ونظارات شمسية (موقع أثري مفتوح)', 'حذاء رياضي مريح للمشي بين الآثار', 'كاميرا', 'مبلغ نقدي'],
    },
    meetingPointDetails: {
      en: 'Doorstep pickup at your Fez accommodation at 9:00 AM.',
      fr: 'Prise en charge à votre hôtel ou riad à 9h00.',
      ar: 'التوصيل من باب مقر إقامتك في فاس عند الساعة 9:00 صباحاً.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to departure.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['History & Archaeology Lovers', 'Couples', 'Families', 'Curious Explorers'],
      fr: ['Passionnés d’archéologie', 'Couples', 'Familles', 'Curieux d’histoire'],
      ar: ['عشاق الآثار والتاريخ الروماني والإسلامي', 'الأزواج', 'العائلات', 'المستكشفون'],
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
          ar: 'فسيفساء وليلي الرومانية مع إطلالة تلال زرهون مشهد ساحر للغاية. السائق وفر لنا راحة تامة طوال اليوم.',
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
          ar: 'من فاس نحو الجبال',
        },
        description: {
          en: 'The road leaves the city for a greener, cooler landscape, then reaches Ifrane, with its distinctive architecture, clean streets and green spaces.',
          fr: 'La route quitte la ville pour un paysage plus vert et plus frais, puis arrive à Ifrane, avec son architecture particulière, ses rues propres et ses espaces verts.',
          ar: 'يغادر الطريق المدينة نحو منظر أكثر خضرة وبرودة، ثم يصل إلى إفران بعمارتها المميزة وشوارعها النظيفة ومساحاتها الخضراء.',
        },
        badge: { en: 'Mountain Road', fr: 'Route de montagne', ar: 'طريق جبلي' },
      },
      {
        time: '',
        title: {
          en: 'Ifrane and the stone lion',
          fr: 'Ifrane et le lion de pierre',
          ar: 'إفران والأسد الحجري',
        },
        description: {
          en: 'Walk the central areas and see the stone lion statue, one of the symbols associated with the city.',
          fr: 'Promenez-vous dans les quartiers centraux et voyez la statue du lion de pierre, l’un des symboles associés à la ville.',
          ar: 'تجولوا في المناطق الوسطى وشاهدوا تمثال الأسد الحجري، أحد الرموز المرتبطة بالمدينة.',
        },
        badge: { en: 'Ifrane', fr: 'Ifrane', ar: 'إفران' },
      },
      {
        time: '',
        title: {
          en: 'Scenic stops along the way',
          fr: 'Arrêts selon la route',
          ar: 'توقفات على الطريق',
        },
        description: {
          en: 'Forests, mountains and countryside. Stops, photographs and short walks depend on the season, the weather and the road. The driver stays flexible, and a local guide can join you if you want one.',
          fr: 'Forêts, montagnes et campagne. Les arrêts, les photos et les courtes marches dépendent de la saison, du temps et de la route. Le chauffeur reste flexible, et un guide local peut vous accompagner si vous le souhaitez.',
          ar: 'غابات وجبال وريف. التوقفات والصور والمشاوير القصيرة تعتمد على الموسم والطقس والطريق. يبقى السائق مرناً، ويمكن أن يرافقكم مرشد محلي إذا أردتم.',
        },
        badge: { en: 'Flexible', fr: 'Flexible', ar: 'مرن' },
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
      ar: [
        'سيارة سياحية خاصة ومريحة مع سائق خبير بأمان الطرق الجبلية',
        'توصيل من باب الفندق أو الرياض والعودة إليه',
        'توقفات على الطريق حسب الموسم وحالة الطريق',
        'شامل جميع مصاريف الوقود والرسوم والمواقف',
      ],
    },
    excluded: {
      en: ['Lunch at local mountain restaurant', 'Personal shopping', 'Driver tip'],
      fr: ['Déjeuner en auberge de montagne', 'Achats personnels', 'Pourboire chauffeur'],
      ar: ['وجبة الغداء في مطعم جبلي', 'المشتريات الشخصية', 'إكرامية السائق'],
    },
    whatToBring: {
      en: ['Comfortable walking shoes', 'Light sweater or jacket (cooler mountain air)', 'Camera'],
      fr: ['Chaussures de marche', 'Gilet ou veste (air frais en altitude)', 'Appareil photo'],
      ar: ['حذاء مريح للمشي في الغابة', 'سترة دافئة خفيفة (طقس الجبل منعش وبارد)', 'كاميرا'],
    },
    meetingPointDetails: {
      en: 'Door-to-door pickup in Fez at 09:00 AM.',
      fr: 'Prise en charge à votre hôtel à Fès à 09h00.',
      ar: 'التوصيل من مقر إقامتك في فاس الساعة 09:00 صباحاً.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before pickup.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['Families with Children', 'Nature Enthusiasts', 'Couples', 'Mountain Air Seekers'],
      fr: ['Familles avec enfants', 'Amoureux de la nature', 'Couples', 'En quête de grand air'],
      ar: ['العائلات والأطفال', 'عشاق الطبيعة والغابات', 'الأزواج', 'الباحثون عن هواء الجبل النقي'],
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
          ar: 'يوم هادئ في الجبال، مع وقت للتوقف حيث نريد. بدت إفران مختلفة جداً عن فاس.',
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
          ar: 'برنامج خاص ومصمم وفق رغبتك بالكامل',
        },
        description: {
          en: 'Tell us the places you want to see, when to leave, and how long to stay at each stop. We arrange the day from Fez around that.',
          fr: 'Dites-nous les lieux, l’heure de départ et le temps à chaque arrêt. Nous organisons la journée au départ de Fès autour de cela.',
          ar: 'أخبرونا بالأماكن ووقت الانطلاق والمدة في كل محطة. نرتب اليوم انطلاقاً من فاس وفق ذلك.',
        },
        badge: { en: 'Bespoke', fr: 'Sur Mesure', ar: 'حسب الطلب' },
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
      ar: [
        'سيارة سياحية خاصة وسائق محترف مخصص لك طوال اليوم',
        'تخطيط مسار خاص والتنسيق المباشر مع فريقنا المحلي',
        'مرونة مطلقة في مواعيد الانطلاق والتوقفات على الطريق',
      ],
    },
    excluded: {
      en: ['Personal expenses & meals', 'Optional monument entrance fees', 'Gratuities'],
      fr: ['Dépenses personnelles & repas', 'Entrées aux sites optionnels', 'Pourboires'],
      ar: ['المصاريف الشخصية والوجبات', 'تذاكر المعالم الاختيارية', 'الإكراميات'],
    },
    whatToBring: {
      en: ['Passport or ID copy', 'Comfortable footwear', 'Camera', 'Cash in MAD'],
      fr: ['Pièce d’identité', 'Chaussures confortables', 'Appareil photo', 'Espèces'],
      ar: ['بطاقة الهوية أو الجواز', 'حذاء مريح', 'كاميرا', 'مبلغ نقدي'],
    },
    meetingPointDetails: {
      en: 'Any location or accommodation in Fez.',
      fr: 'Tout hébergement à Fès.',
      ar: 'أي فندق أو رياض أو عنوان في فاس.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours before tour departure.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['VIP Travelers', 'Families with Custom Needs', 'Special Celebrations', 'Photographers'],
      fr: ['Voyageurs VIP', 'Familles aux besoins spécifiques', 'Célébrations', 'Photographes'],
      ar: ['كبار الشخصيات والمسافرون المميزون', 'العائلات ذات المتطلبات الخاصة', 'المناسبات الخاصة', 'المصورون'],
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
          ar: 'قام ميد وفريقه بتصميم رحلة خاصة رائعة لنا في جبال الأطلس وبساتين الكرز. احترافية عالية ومرونة وأمانة لا مثيل لها.',
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
          ar: 'المحطة الأولى: الحرشة الفاسية الساخنة والبغرير بالعسل والزبدة البلدية',
        },
        description: {
          en: 'Begin at an authentic neighborhood griddle tasting piping hot semolina harcha spread with goat cheese, wild mountain honey, and thousand-hole baghrir.',
          fr: 'Démarrez devant une plaque traditionnelle pour goûter la galette de semoule harcha fumante avec miel de montagne et crêpes baghrir.',
          ar: 'البداية في مخبز شعبي لتذوق الحرشة الساخنة بالسميد والزبدة البلدية والعسل الطبيعي والجبن الجبلي والبغرير الفاسي المخرم.',
        },
        badge: { en: 'Morning Bite', fr: 'Douceur Matinale', ar: 'فطور بلدي' },
      },
      {
        time: '11:00 AM',
        title: {
          en: 'Stop 2: Steaming Bissara with Extra Virgin Olive Oil & Cumin',
          fr: 'Étape 2 : Bissara Fumante à l’Huile d’Olive & Cumin',
          ar: 'المحطة الثانية: حساء البيصارة المطهو بزيت الزيتون والكمون البلدي',
        },
        description: {
          en: 'Sip traditional slow-simmered fava bean soup directly from an earthenware bowl, drizzled with local Saïss olive oil, freshly ground cumin, and warm flatbread.',
          fr: 'Dégustez dans une échoppe populaire la soupe de fèves onctueuse, parfumée d’huile d’olive du terroir et de cumin moulu.',
          ar: 'جلسة شعبية لتناول حساء البيصارة اللذيذ المطهو على نار هادئة بزيت الزيتون البكر من سهول سايس ورشة الكمون والخبز الساخن.',
        },
        badge: { en: 'Authentic Soul Food', fr: 'Plat Populaire', ar: 'أكلة شعبية أصيلة' },
      },
      {
        time: '12:00 PM',
        title: {
          en: 'Stop 3: Ferran l-Houma (Wood-Fired Communal Oven)',
          fr: 'Étape 3 : Le Ferran l-Houma (Fournil Traditionnel du Quartier)',
          ar: 'المحطة الثالثة: فران الحومة التقليدي بنار خشب الأرز',
        },
        description: {
          en: 'Step into the underground stone oven where families bring their kneaded dough. Smell fresh loaves baked over scented cedar wood embers.',
          fr: 'Pénétrez dans le fournil de quartier où les familles apportent leur pain pétri à la main, cuit au feu de bois de cèdre.',
          ar: 'الدخول إلى فران الحومة الأثري حيث تحمل العائلات خبزها اليومي، واستنشاق رائحة الخبز البلدي المخبوز على حطب الأرز المعطر.',
        },
        badge: { en: 'Community Hearth', fr: 'Cœur du Quartier', ar: 'فران الحومة' },
      },
      {
        time: '01:00 PM',
        title: {
          en: 'Stop 4: Crispy Fresh Sfenj Fried Before Your Eyes',
          fr: 'Étape 4 : Sfenj Croustillants Frits sous vos Yeux',
          ar: 'المحطة الرابعة: السفنج الفاسي المقرمش الطازج',
        },
        description: {
          en: 'Watch the sfenj master stretch airy dough with wet fingertips, fry golden rings in bubbling oil, and string them with fresh palm leaves.',
          fr: 'Admirez le tour de main du maître beignatier et croquez dans un sfenj doré et croustillant tout juste sorti du bain d’huile.',
          ar: 'مشاهدة حرفي السفنج وهو يشكل العجين بأصابعه بخفة متناهية ويقليه حتى يصبح ذهبياً مقرمشاً، ويربطه بسعف النخيل البلدي.',
        },
        badge: { en: 'Fresh & Crispy', fr: 'Tout Chaud', ar: 'مقرمش وطازج' },
      },
      {
        time: '01:45 PM',
        title: {
          en: 'Stop 5: Mint Tea Ceremony with Chebakia & Gazelle Horns',
          fr: 'Étape 5 : Cérémonie du Thé à la Menthe & Pâtisseries Fassies',
          ar: 'المحطة الخامسة: صينية الشاي بالنعناع مع الشباكية وكعب الغزال',
        },
        description: {
          en: 'Conclude with a high-poured traditional mint tea ritual accompanied by almond gazelle horns (kaab el-ghzal) and honeyed chebakia.',
          fr: 'Terminez avec le rituel du thé à la menthe servi de haut avec cornes de gazelle aux amandes et chebakia parfumée à la fleur d’oranger.',
          ar: 'ختام الجولة بجلسة شاي أصيلة مسكوب من علو مع رغوة بيضاء، وتذوق كعب الغزال بحشوة اللوز وماء الزهر والشباكية المعسلة.',
        },
        badge: { en: 'Sweet Finale', fr: 'Douceur Finale', ar: 'جلسة شاي أصيلة' },
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
      ar: [
        'مرشد خبير بالمطبخ الفاسي وأصول الطبخ العائلي العريق',
        'جميع التذوقات والمأكولات الشعبية والحلويات والمشروبات مشمولة (تغني عن وجبة غداء كاملة)',
        'جولة خاصة 100% لك ولمجموعتك فقط',
        'زيارة حصرية لفران الحومة ومتاجر الحرفيين التي لا يعرفها السياح العاديون',
        'مراعاة أي حساسيات غذائية أو اختيارات نباتية مسبقاً',
      ],
    },
    excluded: {
      en: ['Alcoholic beverages (none served in the Medina stalls)', 'Personal take-home shopping of spices or sweets', 'Guide tip'],
      fr: ['Boissons alcoolisées', 'Achats d’épices ou douceurs à emporter', 'Pourboire guide'],
      ar: ['المشروبات الكحولية', 'شراء التوابل أو علب الحلويات للمنزل', 'إكرامية المرشد'],
    },
    whatToBring: {
      en: ['A very healthy appetite!', 'Comfortable walking shoes', 'Hand wipes or sanitizing gel', 'Camera'],
      fr: ['Un solide appétit !', 'Chaussures de marche', 'Lingettes', 'Appareil photo'],
      ar: ['شهية مفتوحة وجوع حقيقي للاستمتاع بكل تذوق!', 'حذاء مريح للمشي', 'مناديل مبللة', 'كاميرا'],
    },
    meetingPointDetails: {
      en: 'Bab Boujloud (Blue Gate) or pickup at your Medina Riad at 10:00 AM.',
      fr: 'Bab Boujloud ou départ depuis votre Riad à 10h00.',
      ar: 'أمام باب بوجلود التاريخي أو من مقر إقامتك بالرياض عند الساعة 10:00 صباحاً.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to tour start.',
      fr: 'Annulation gratuite jusqu’à 24 heures avant le début de la visite.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل موعد بدء الجولة.',
    },
    suitableFor: {
      en: ['Food Lovers & Curious Eaters', 'Couples', 'Families', 'Culture Enthusiasts'],
      fr: ['Amateurs de bonne chère', 'Couples', 'Familles', 'Passionnés de culture'],
      ar: ['عشاق الأكل والتذوق الشعبي الأصيل', 'الأزواج', 'العائلات', 'الباحثون عن الثقافة اليومية'],
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
          ar: 'كطاهٍ محترف، كانت هذه أصدق جولة طعام عشتها في المغرب. أكل شعبي حقيقي ولذيذ وسط أهل فاس، والسفنج والبيصارة حكاية استثنائية!',
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
          ar: 'تاريخ المطبخ الفاسي الإمبراطوري وأصوله الأندلسية',
        },
        description: {
          en: 'Introduction to Arab-Andalusian culinary crosscurrents, spice blending with Ras el Hanout, and the royal pastilla tradition.',
          fr: 'Introduction aux influences arabo-andalouses, composition du Ras el Hanout et secrets de la pastilla royale.',
          ar: 'مقدمة عن التأثيرات الأندلسية والمغربية في الطبخ الفاسي، وتركيبة بهارات رأس الحانوت النادرة وأسرار البسطيلة الملكية.',
        },
        badge: { en: 'Culinary Heritage', fr: 'Héritage Culinaire', ar: 'تراث الطهي' },
      },
      {
        time: '12:30 PM',
        title: {
          en: 'Royal Pastilla & Slow-Simmered Tajine Tasting',
          fr: 'Dégustation de Pastilla Royale & Tajines Mijotés',
          ar: 'مائدة البسطيلة الفاسية وطواجن اللحم بالبرقوق واللوز',
        },
        description: {
          en: 'Savor crisp golden pastilla dusted with cinnamon and sugar, followed by slow-cooked lamb with caramelized prunes, toasted almonds, and handmade flatbreads.',
          fr: 'Dégustation de pastilla croustillante à la cannelle suivie d’un tajine d’agneau fondant aux pruneaux caramélisés et amandes torréfiées.',
          ar: 'تذوق البسطيلة المقرمشة بالقرفة واللوز، يليها طاجين لحم الغنم الفاسي بالبرقوق المعسل واللوز المقلي والخبز البلدي الساخن.',
        },
        badge: { en: 'Royal Feast', fr: 'Festin Royal', ar: 'وليمة ملكية' },
      },
      {
        time: '02:00 PM',
        title: {
          en: 'Tea Ceremony & Gazelle Horns (Kaab el-Ghzal)',
          fr: 'Cérémonie du Thé & Cornes de Gazelle',
          ar: 'جلسة الشاي الفاسي وكعب الغزال الأصيل',
        },
        description: {
          en: 'End the feast with orange blossom infused almond pastries and authentic fresh mint tea.',
          fr: 'Clôture avec pâtisseries aux amandes et eau de fleur d’oranger, accompagnées du thé à la menthe.',
          ar: 'ختام الجلسة بكعب الغزال المعطر بماء الزهر الحر وشاي النعناع المنعش.',
        },
        badge: { en: 'Sweet Finish', fr: 'Douceur', ar: 'حلويات فاسية' },
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
      ar: [
        'وجبة غداء مغربية ملكية كاملة (بسطيلة، طواجن، سلطات مغربية، حلويات، مشروبات)',
        'تجربة خاصة 100% في رياض فاسي تراثي عريق',
        'شروحات موثقة لأسرار الطبخ من خبير محلي',
        'صينية شاي مغربي بالنعناع والحلويات التقليدية',
      ],
    },
    excluded: {
      en: ['Alcoholic beverages', 'Personal souvenir purchases', 'Staff gratuities'],
      fr: ['Boissons alcoolisées', 'Achats personnels', 'Pourboires'],
      ar: ['المشروبات الكحولية', 'المشتريات الشخصية', 'الإكراميات'],
    },
    whatToBring: {
      en: ['Good appetite', 'Camera for beautiful food presentation photos'],
      fr: ['Bonne faim', 'Appareil photo pour les superbes présentations'],
      ar: ['شهية جيدة', 'كاميرا لتوثيق أطباق المائدة الفاسية الفاخرة'],
    },
    meetingPointDetails: {
      en: 'Doorstep pickup at your Riad or hotel in Fez at 11:00 AM.',
      fr: 'Prise en charge à votre riad à Fès à 11h00.',
      ar: 'التوصيل من باب مقر إقامتك بالرياض في فاس عند الساعة 11:00 صباحاً.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours prior to experience.',
      fr: 'Annulation gratuite jusqu’à 24h avant le départ.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['Couples', 'Food Connoisseurs', 'Families', 'Special Occasion Celebrations'],
      fr: ['Couples', 'Gastronomes', 'Familles', 'Célébrations'],
      ar: ['الأزواج', 'عشاق المطبخ الرفيع', 'العائلات', 'المناسبات والاحتفالات الخاصة'],
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
          ar: 'البسطيلة هنا تحفة فنية لا تُضاهى، تذوب في الفم بنكهة القرفة واللوز المتوازنة. أفضل وجبة تذوقناها في المغرب!',
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
          ar: 'فران الحومة الشعبي وتقاليد خبز الدار البلدي',
        },
        description: {
          en: 'Witness families and children delivering proofed bread dough to be baked on scented cedar wood embers. Learn the unique bread seals of neighborhood families.',
          fr: 'Découvrez la tradition vivante du pain cuit au feu de bois dans les vieux fournil souterrains de la médina.',
          ar: 'مشاهدة أهالي الحومة وهم يحملون صواني الخبز المطبوع بختم العائلة ليخبز على جمر خشب الأرز الفواح.',
        },
        badge: { en: 'Living Tradition', fr: 'Tradition Vivante', ar: 'تقليد حي' },
      },
      {
        time: '11:00 AM',
        title: {
          en: 'Sacred Friday Couscous Ritual & Seven Vegetables',
          fr: 'Le Rituel Sacré du Couscous du Vendredi & Sept Légumes',
          ar: 'طقوس كسكس يوم الجمعة المباركة والخضار السبع',
        },
        description: {
          en: 'Learn how couscous is hand-rolled from durum semolina, steamed three times in a couscoussier, and crowned with pumpkin, carrots, zucchini, turnips, cabbage, chickpeas, and sweet caramelized tfaya.',
          fr: 'Comprenez le savoir-faire ancestral du couscous roulé à la main, cuit à la vapeur trois fois et garni des 7 légumes et tfaya caramélisée.',
          ar: 'التعرف على فن فتل الكسكس يدوياً، وتفويره 3 مرات فوق المرق العطر، وتزيينه بالقرع والجزر والكوسا والحمص والتفاية المعسلة.',
        },
        badge: { en: 'Friday Heritage', fr: 'Couscous Rituel', ar: 'كسكس الجمعة' },
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
      ar: [
        'جولة مشي خاصة داخل دروب وأحياء فاس السكنية الأصيلة',
        'دخول حصري لأفران الحومة والمطاحن التقليدية التاريخية',
        'تذوق الخبز الساخن الخارج لتوه من الفران مع زيت الزيتون والشاي',
        'شرح ممتع لأواصر التضامن الاجتماعي وعادات أهل فاس العريقة',
      ],
    },
    excluded: {
      en: ['Personal grocery shopping', 'Guide tip'],
      fr: ['Achats personnels', 'Pourboire guide'],
      ar: ['المشتريات التذكارية', 'إكرامية المرشد'],
    },
    whatToBring: {
      en: ['Comfortable walking shoes', 'Modest clothing for residential quarters', 'Camera'],
      fr: ['Chaussures confortables', 'Tenue décente pour les quartiers résidentiels', 'Appareil photo'],
      ar: ['حذاء مريح', 'لباس محتشم ومريح يناسب الأحياء السكنية', 'كاميرا'],
    },
    meetingPointDetails: {
      en: 'Bab Boujloud or pickup at your Riad in Fez.',
      fr: 'Bab Boujloud ou départ de votre riad.',
      ar: 'أمام باب بوجلود أو من مقر إقامتك بالرياض.',
    },
    cancellationPolicy: {
      en: 'Free cancellation up to 24 hours in advance.',
      fr: 'Annulation gratuite jusqu’à 24h avant.',
      ar: 'إلغاء مجاني حتى 24 ساعة قبل الموعد.',
    },
    suitableFor: {
      en: ['Anthropology & Culture Seekers', 'Families', 'Slow Travel Enthusiasts'],
      fr: ['Amateurs de culture', 'Familles', 'Voyageurs curieux'],
      ar: ['الباحثون عن الأصالة الثقافية', 'العائلات', 'عشاق السفر الهادئ'],
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
          ar: 'دخول فران الحومة واستنشاق رائحة خشب الأرز والخبز الساخن تجربة حفرت في ذاكرتنا. حكاية الكسكس الفاسي وثقافته رائعة جداً.',
        },
      },
    ],
  },
};
