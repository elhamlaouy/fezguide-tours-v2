import { Language } from '../types';

type Copy = Record<Language, string>;
const copy = (en: string, fr: string, ar: string): Copy => ({ en, fr, ar });
const paras = (en: string[], fr: string[]): Record<Language, string[]> => ({ en, fr, ar: en });
const img = (src: string, width: number, height: number, en: string, fr: string, ar: string) => ({
  src, width, height, alt: copy(en, fr, ar),
});

const parent = copy('Travel Tips', 'Conseils voyage', 'نصائح السفر');

export const TIP_ARTICLES = [
  {
    id: 'tips-getting-around',
    template: 'editorial-guide',
    parentLabel: parent,
    title: copy('Getting Around Fez', 'Se déplacer à Fès', 'التنقل في فاس'),
    sections: [
      {
        images: [img('/images/tips-getting-around/medina-walker.webp', 800, 1422, 'A man walking a narrow Medina lane', 'Un homme marche dans une ruelle de la médina', 'رجل يمشي في زقاق ضيق بالمدينة')],
        paragraphs: paras(
          [
            'Getting around Fez is different from moving around a modern city. The Old Medina was built around walking, with narrow streets, small passages and many pedestrian areas. Outside the Medina, taxis and cars are much more practical.',
            'As a visitor, you have two main ways to explore the Old Medina: you can discover it with a local guide, or explore it independently. Both are possible, but each offers a different experience.',
          ],
          [
            'Se déplacer à Fès n’est pas comme dans une ville moderne. La vieille médina a été faite pour la marche : rues étroites, petits passages et beaucoup de zones piétonnes. En dehors, les taxis et les voitures sont plus pratiques.',
            'Vous pouvez découvrir la vieille médina avec un guide local, ou seul. Les deux sont possibles, mais l’expérience n’est pas la même.',
          ],
        ),
      },
      {
        heading: copy('Walking in the Old Medina', 'Marcher dans la vieille médina', 'المشي في المدينة العتيقة'),
        paragraphs: paras(
          [
            'Walking is the main way people move around the Old Medina. Many streets are narrow and made for pedestrians. As you walk, you pass homes, shops, workshops, food stalls, souks and residential neighbourhoods.',
            'For local people, this is everyday life. For visitors, it can feel like another world. The Medina is large, so there is no need to rush. The streets themselves are part of the experience.',
          ],
          [
            'La marche est le moyen principal de se déplacer dans la vieille médina. Beaucoup de rues sont étroites et faites pour les piétons. On passe devant des maisons, des boutiques, des ateliers, des étals et des souks.',
            'Pour les habitants, c’est le quotidien. Pour un visiteur, cela peut sembler un autre monde. La médina est grande : inutile de courir. Les rues font partie de l’expérience.',
          ],
        ),
        images: [],
      },
      {
        heading: copy('How heavy goods move through the Medina', 'Comment les charges lourdes circulent', 'كيف تتنقل البضائع الثقيلة'),
        images: [img('/images/tips-getting-around/mule-load.webp', 800, 600, 'A mule carrying goods through a Medina lane', 'Une mule transporte une charge dans une ruelle', 'بغل يحمل بضاعة في زقاق')],
        paragraphs: paras(
          [
            'The narrow streets are not only used by people. When heavy goods need to move through the small streets, people traditionally use carts, donkeys or mules. Many alleys are too narrow for normal vehicles, so transport has adapted to the Medina. You may see this as part of everyday life.',
          ],
          [
            'Les rues étroites ne servent pas qu’aux passants. Pour les charges lourdes, on utilise encore des charrettes, des ânes ou des mulets. Beaucoup de ruelles sont trop étroites pour une voiture. Vous pouvez voir cela dans la vie quotidienne.',
          ],
        ),
      },
      {
        heading: copy('When is the Medina active?', 'Quand la médina est-elle active ?', 'متى تنشط المدينة؟'),
        images: [img('/images/tips-getting-around/bab-boujloud-night.webp', 1364, 908, 'Bab Boujloud lit at night', 'Bab Boujloud éclairée le soir', 'باب بوجلود مضاء ليلاً')],
        paragraphs: paras(
          [
            'The main commercial areas generally become active from around 10:00 in the morning and start becoming quieter from around 20:00. Around Bab Boujloud, restaurants and other places can stay active much later, sometimes until around midnight.',
            'During the day, the streets are tied to shops, workshops, markets and local life. The Bab Boujloud area can stay lively into the evening. Opening hours vary by business, day and season, so treat these times as a general rhythm, not a fixed schedule.',
          ],
          [
            'Les zones commerciales s’animent en général vers 10 h et se calment vers 20 h. Autour de Bab Boujloud, restaurants et autres lieux peuvent rester ouverts bien plus tard, parfois jusqu’à minuit.',
            'Le jour, les rues suivent les boutiques, les ateliers et les marchés. Bab Boujloud peut rester animée le soir. Les horaires changent selon le commerce, le jour et la saison : c’est un rythme, pas un horaire fixe.',
          ],
        ),
      },
      {
        heading: copy('Two ways to explore, and how to read the signs', 'Deux façons de visiter, et les panneaux', 'طريقتان للاستكشاف، وكيف تقرأ اللافتات'),
        images: [
          img('/images/tips-getting-around/hexagonal-sign.webp', 1542, 2048, 'A hexagonal street sign in the Medina', 'Un panneau hexagonal dans la médina', 'لافتة سداسية في المدينة'),
          img('/images/tips-getting-around/square-sign.webp', 2048, 1542, 'A square street sign in the Medina', 'Un panneau carré dans la médina', 'لافتة مربعة في المدينة'),
        ],
        paragraphs: paras(
          [
            'You can explore with a local guide or on your own. A guide can help you understand what you are seeing, save time, choose practical routes and make navigation easier. Exploring alone is possible, but the Old Medina can confuse a first visit. You may spend longer than expected going the wrong way.',
            'A square sign means the alley has an entrance and an exit, or that it leads to an open public space. A hexagonal sign means the alley has an entrance but does not continue through. It is a dead end. Check the sign before you enter, instead of discovering later that you have to turn back.',
          ],
          [
            'Vous pouvez visiter avec un guide local ou seul. Un guide aide à comprendre ce que vous voyez, à gagner du temps et à choisir un chemin pratique. Seul, c’est possible, mais la vieille médina peut dérouter une première visite.',
            'Un panneau carré indique une ruelle qui a une entrée et une sortie, ou qui mène à un espace public ouvert. Un panneau hexagonal indique une ruelle qui a une entrée mais ne traverse pas. C’est une impasse. Regardez le panneau avant d’entrer.',
          ],
        ),
      },
      {
        heading: copy('A simple route on your own', 'Un parcours simple sans guide', 'مسار بسيط من دون مرشد'),
        images: [img('/images/tips-getting-around/talaa-souk.webp', 978, 1300, 'A busy covered souk lane in the Medina', 'Une ruelle couverte et animée du souk', 'زقاق سوق مسقوف ومزدحم')],
        paragraphs: paras(
          [
            'Start around the Mellah, the Jewish Quarter and the area around the Royal Palace. From there, visit Jnan Sbil and follow the main road towards Bab Boujloud. Once you reach Bab Boujloud, enter the Old Medina.',
            'From Bab Boujloud, Tala\'a Sghira (Small Ascent) is on the right and Tala\'a Kebira (Great Ascent) is on the left. For a first visit, follow Tala\'a Kebira. A very large share of the Medina\'s important monuments, museums, souks and interesting places are along or around this route. You can also step into smaller side alleys. The signs tell you whether an alley continues or ends.',
          ],
          [
            'Commencez vers le Mellah, le quartier juif et le Palais royal. De là, visitez Jnan Sbil puis suivez la route principale vers Bab Boujloud. Entrez ensuite dans la vieille médina.',
            'Depuis Bab Boujloud, Tala\'a Sghira (la petite montée) est à droite et Tala\'a Kebira (la grande montée) à gauche. Pour une première visite, suivez Tala\'a Kebira. Une grande part des monuments, musées, souks et lieux intéressants se trouve sur ce parcours ou autour. Les panneaux indiquent si une ruelle continue ou s’arrête.',
          ],
        ),
      },
      {
        heading: copy('Continue towards Bab Rcif, then leave by taxi', 'Continuer vers Bab Rcif, puis sortir en taxi', 'نحو باب الرصيف، ثم الخروج بالتاكسي'),
        images: [
          img('/images/tips-getting-around/bab-rcif.webp', 800, 1646, 'A gate and market square at the edge of the Medina', 'Une porte et une place au bord de la médina', 'باب وساحة سوق على طرف المدينة'),
          img('/images/tips-getting-around/city-gate.webp', 800, 1423, 'A monumental city gate with a red taxi nearby', 'Une porte monumentale, avec un taxi rouge', 'باب ضخم وتاكسي أحمر قريب'),
        ],
        paragraphs: paras(
          [
            'As you continue, you move through the southern part of the Old Medina and can reach Bab Rcif. You will have seen a large part of the historic city, not everything. The Old Medina is too large for one visit. From Bab Rcif, reach the nearest accessible road and take a petit taxi to your hotel or next stop.',
            'To reach the New City, leave the pedestrian areas through a gate or road where vehicles can meet you. Practical taxi points include Bab Boujloud, Bab Rcif, Bab Mahrouk, Bab Ziat, Ain Azliten, Bab Guissa and Batha.',
          ],
          [
            'En continuant, vous traversez le sud de la vieille médina et pouvez arriver à Bab Rcif. Vous aurez vu une grande partie de la ville historique, pas tout. Depuis Bab Rcif, rejoignez la route accessible et prenez un petit taxi.',
            'Pour aller vers la ville nouvelle, sortez des zones piétonnes par une porte ou une route où les voitures peuvent vous prendre. Des points pratiques : Bab Boujloud, Bab Rcif, Bab Mahrouk, Bab Ziat, Aïn Azliten, Bab Guissa et Batha.',
          ],
        ),
      },
      {
        heading: copy('Petit taxis, and the two sides of Fez', 'Les petits taxis, et les deux visages de Fès', 'التاكسي الصغير، ووجها فاس'),
        images: [img('/images/tips-getting-around/new-city-road.webp', 941, 1671, 'A road with cars outside the old streets', 'Une route avec des voitures hors des vieilles rues', 'طريق وسيارات خارج الأزقة القديمة')],
        paragraphs: paras(
          [
            'The petit taxi is one of the easiest ways to move around Fez outside the pedestrian areas. Fez\'s petit taxis are red. For a short journey from the Old Medina towards the New City, the fare is often around 10–20 MAD, depending on distance. That is a local estimate, not a fixed price for every trip. A petit taxi normally carries up to 3 passengers plus the driver. With more than three people, you usually need two taxis or another vehicle. The taxi takes you as close as the road allows. After that, you walk.',
            'Inside the Old Medina, walking is essential. Outside, taxis and cars are more practical. Getting around Fez often means both: walking in the historic areas, and a taxi or private car between different parts of the city.',
            'A local guide can make the Old Medina easier. You spend less time checking your phone or worrying about the direction. A guide can also help with time, routes, history, crafts, food and everyday life. You can focus on the Medina instead of navigation.',
            'Whether you explore alone or with a guide, the aim is the same. Walk the Medina. Discover its streets. See Fez through local eyes.',
          ],
          [
            'Le petit taxi est un moyen simple de se déplacer hors des zones piétonnes. À Fès, les petits taxis sont rouges. Pour un court trajet de la vieille médina vers la ville nouvelle, le prix est souvent autour de 10 à 20 MAD, selon la distance. C’est une estimation locale, pas un tarif fixe. Un petit taxi prend en général jusqu’à 3 passagers plus le chauffeur. Au-delà, il faut souvent deux taxis. Le taxi vous dépose au plus près de la route. Ensuite, on marche.',
            'Dans la vieille médina, la marche est indispensable. En dehors, taxis et voitures sont plus pratiques. Se déplacer à Fès, c’est souvent les deux.',
            'Un guide local rend la vieille médina plus simple. Vous passez moins de temps sur le téléphone ou à chercher la direction. Vous pouvez profiter de la médina au lieu de penser au chemin.',
            'Seul ou avec un guide, le but reste le même. Marchez dans la médina. Découvrez ses rues. Voyez Fès à travers des yeux locaux.',
          ],
        ),
      },
    ],
  },
  {
    id: 'tips-plan-trip',
    template: 'editorial-guide',
    parentLabel: parent,
    title: copy('Planning Your Visit to Fez', 'Planifier votre visite à Fès', 'التخطيط لزيارة فاس'),
    contact: {
      href: 'https://wa.me/212719603009',
      label: copy('Contact us on WhatsApp', 'Nous écrire sur WhatsApp', 'راسلونا على واتساب'),
    },
    sections: [
      {
        images: [img('/images/tips-plan-trip/medina-view.webp', 800, 533, 'A wide view over the Fez Medina', 'Une vue large sur la médina de Fès', 'إطلالة واسعة على مدينة فاس')],
        paragraphs: paras(
          [
            'Planning a trip to Fez does not have to be complicated. The city has a lot to offer, from the historic Medina and its traditional crafts to the Mellah, local food, viewpoints and day trips into the surrounding countryside.',
            'The best way to enjoy it is to give yourself enough time to explore without trying to see everything in one day.',
          ],
          [
            'Préparer un voyage à Fès n’a pas besoin d’être compliqué. La ville offre beaucoup : la médina historique, les métiers, le Mellah, la cuisine, les points de vue et des excursions dans les environs.',
            'Le mieux est de se laisser assez de temps, sans vouloir tout voir en une journée.',
          ],
        ),
      },
      {
        heading: copy('How many days do you need?', 'Combien de jours faut-il ?', 'كم يوماً تحتاجون؟'),
        images: [img('/images/tips-plan-trip/souk-lane.webp', 800, 1200, 'Visitors walking a covered souk lane', 'Des visiteurs dans une ruelle couverte du souk', 'زوار في زقاق سوق مسقوف')],
        paragraphs: paras(
          [
            'For a first visit, we recommend at least 2 to 3 days in Fez. That gives time for the Old Medina, historical landmarks, local food, and another side of the city.',
            'With 4 days or longer, you can slow down and add a day trip, such as Chefchaouen, Meknes and Volubilis, or the Middle Atlas. The right length depends on what you want to experience.',
          ],
          [
            'Pour une première visite, nous recommandons au moins 2 à 3 jours. Cela laisse le temps pour la vieille médina, les lieux historiques, la cuisine locale et un autre visage de la ville.',
            'Avec 4 jours ou plus, vous pouvez ralentir et ajouter une excursion, par exemple Chefchaouen, Meknès et Volubilis, ou le Moyen Atlas. La bonne durée dépend de ce que vous voulez vivre.',
          ],
        ),
      },
      {
        heading: copy('When is the best time to visit?', 'Quelle est la meilleure période ?', 'ما أفضل وقت للزيارة؟'),
        images: [img('/images/tips-plan-trip/bab-boujloud.webp', 800, 800, 'Visitors at Bab Boujloud', 'Des visiteurs à Bab Boujloud', 'زوار عند باب بوجلود')],
        paragraphs: paras(
          [
            'Fez can be visited all year. Spring and autumn are particularly comfortable for long walks in the Medina. The weather is generally milder.',
            'Summer can be hot, especially in the middle of the day. Winter can bring cooler mornings and evenings. If you are mainly walking and sightseeing, a comfortable season makes a noticeable difference.',
          ],
          [
            'Fès se visite toute l’année. Le printemps et l’automne sont particulièrement agréables pour de longues marches dans la médina. Le temps est en général plus doux.',
            'L’été peut être chaud, surtout en milieu de journée. L’hiver peut être plus frais le matin et le soir. Si vous marchez beaucoup, une saison confortable change vraiment la visite.',
          ],
        ),
      },
      {
        heading: copy('Plan the Medina, and choose where you stay', 'Prévoir la médina, et choisir où dormir', 'خطّطوا للمدينة، واختاروا مكان الإقامة'),
        images: [
          img('/images/tips-plan-trip/medina-alley.webp', 800, 1067, 'A narrow alley in the Old Medina', 'Une ruelle étroite de la vieille médina', 'زقاق ضيق في المدينة العتيقة'),
          img('/images/tips-plan-trip/riad-courtyard.webp', 800, 1067, 'A riad courtyard with a pool', 'Une cour de riad avec un bassin', 'فناء رياض بحوض'),
        ],
        paragraphs: paras(
          [
            'The Old Medina deserves time. Do not plan several major attractions in a few hours and expect to understand the city. Give yourself time to walk, stop at the souks, visit historical sites, see workshops and watch everyday life. A private local guide can also help you organise the places that interest you most.',
            'Staying inside or close to the Old Medina gives easy access to the historic streets. Staying in the New City can be more convenient if you prefer modern streets and easier vehicle access. Neither is automatically better. It depends on the experience you want.',
            'Cars cannot normally enter the narrow streets of the Old Medina. If your accommodation is inside the Medina, you may need to walk from the nearest accessible point with your luggage.',
          ],
          [
            'La vieille médina demande du temps. Ne prévoyez pas plusieurs grands sites en quelques heures en espérant comprendre la ville. Laissez-vous marcher, vous arrêter aux souks, voir des ateliers et observer la vie. Un guide local privé peut aussi organiser les lieux qui vous intéressent le plus.',
            'Dormir dans la vieille médina ou tout près donne un accès simple aux rues historiques. La ville nouvelle peut être plus pratique si vous préférez des rues modernes et un accès plus facile en voiture. Aucun choix n’est automatiquement meilleur.',
            'Les voitures n’entrent en général pas dans les rues étroites. Si votre logement est dans la médina, vous devrez peut-être marcher depuis le point accessible le plus proche avec vos bagages.',
          ],
        ),
      },
      {
        heading: copy('What do you want to experience?', 'Que voulez-vous vivre ?', 'ماذا تريدون أن تعيشوا؟'),
        images: [img('/images/tips-plan-trip/rooftops.webp', 800, 533, 'Rooftops of Fez from a viewpoint', 'Les toits de Fès depuis un point de vue', 'أسطح فاس من مطل')],
        paragraphs: paras(
          [
            'Before you arrive, think about what interests you most: history and monuments, traditional crafts and souks, Moroccan and Fassi food, local life and culture, photography and viewpoints, a relaxed private walk, or day trips outside Fez. Knowing that helps you build a better plan than a list of attractions.',
            'Leave some free time. You may find a small food shop, a workshop, a tea stop or a viewpoint you did not know about. Those details are easy to miss when you rush.',
          ],
          [
            'Avant d’arriver, pensez à ce qui vous intéresse le plus : histoire et monuments, métiers et souks, cuisine marocaine et fassie, vie locale, photos et points de vue, une marche privée tranquille, ou des excursions. Cela vaut mieux qu’une simple liste d’attractions.',
            'Laissez du temps libre. Vous pouvez trouver une petite boutique, un atelier, un thé ou un point de vue que vous ne connaissiez pas. Ces détails se perdent quand on se presse.',
          ],
        ),
      },
      {
        heading: copy('A day trip from Fez, without overplanning', 'Une excursion, sans trop planifier', 'رحلة يومية، من دون إفراط في التخطيط'),
        images: [
          img('/images/tips-plan-trip/new-city-road.webp', 941, 1671, 'A road leaving the old streets of Fez', 'Une route qui quitte les vieilles rues de Fès', 'طريق يغادر أزقة فاس القديمة'),
          img('/images/tips-plan-trip/night-view.webp', 1080, 810, 'Fez lit at night from a viewpoint', 'Fès éclairée la nuit depuis un point de vue', 'فاس مضاءة ليلاً من مطل'),
        ],
        paragraphs: paras(
          [
            'Fez is a good base for northern and central Morocco. A private day trip can go to Chefchaouen, known for its blue streets, old town and mountain setting; to Meknes, Volubilis and Moulay Idriss, for imperial history, Roman ruins and a pilgrimage town; or to Ifrane and the Middle Atlas, for forests, mountains and countryside. A private day trip lets you stay longer where you are interested, instead of following a rushed schedule.',
            'A good trip needs a plan, and also space. Book the important things in advance, especially accommodation and the experiences you really want. Then leave room to discover the city. Fez is not a city you fully understand by checking attractions off a list. You experience it by walking, tasting, observing and taking your time.',
            'If you are not sure how many days to spend, where to stay, what to visit first or which day trip suits you, contact us. We can share local advice based on your interests and plans.',
          ],
          [
            'Fès est une bonne base pour le nord et le centre du Maroc. Une excursion privée peut aller à Chefchaouen, connue pour ses rues bleues, sa vieille ville et son cadre de montagne ; à Meknès, Volubilis et Moulay Idriss, pour l’histoire impériale, les ruines romaines et une ville de pèlerinage ; ou à Ifrane et au Moyen Atlas, pour les forêts, les montagnes et la campagne. En privé, vous restez plus longtemps là où cela vous intéresse.',
            'Un bon voyage a un plan, et aussi de l’espace. Réservez l’essentiel à l’avance, surtout le logement et les expériences que vous voulez vraiment. Puis laissez de la place pour découvrir la ville. Fès ne se comprend pas en cochant une liste. On la vit en marchant, en goûtant, en observant et en prenant le temps.',
            'Si vous hésitez sur le nombre de jours, le quartier, la première visite ou l’excursion, contactez-nous. Nous pouvons vous conseiller selon vos intérêts et votre voyage.',
          ],
        ),
      },
    ],
  },
  {
    id: 'tips-practical',
    template: 'editorial-guide',
    parentLabel: parent,
    title: copy('Practical Tips for Visitors', 'Conseils pratiques pour les visiteurs', 'نصائح عملية للزوار'),
    sections: [
      {
        images: [img('/images/tips-practical/medina-steps.webp', 975, 1300, 'A sloping lane in the Fez Medina', 'Une ruelle en pente dans la médina de Fès', 'زقاق منحدر في مدينة فاس')],
        paragraphs: paras(
          [
            'A few simple things can make your stay in Fez much easier and more comfortable. Fez has its own rhythm and customs. You do not need to know everything before you arrive. A few practical details can help you feel more comfortable, avoid common misunderstandings and enjoy the city.',
          ],
          [
            'Quelques choses simples rendent un séjour à Fès plus facile et plus confortable. La ville a son rythme et ses usages. Vous n’avez pas besoin de tout savoir avant d’arriver. Quelques détails pratiques suffisent pour vous sentir plus à l’aise.',
          ],
        ),
      },
      {
        heading: copy('Cash, shoes and clothing', 'Espèces, chaussures et tenue', 'النقد والأحذية واللباس'),
        paragraphs: paras(
          [
            'Carry some Moroccan dirhams. Cards are accepted in many hotels, restaurants and modern shops, but cash still matters for small purchases, local food, taxis, small shops and traditional markets. Keep some smaller notes and coins, especially in the Medina.',
            'You will probably walk more than you expect. The streets can be uneven, with steps, slopes and narrow passages. Choose shoes you can walk in for several hours.',
            'Fez is a traditional city. Modest, comfortable clothing is the easiest choice. You do not need special clothes, but covering the shoulders and knees is a good way to respect the local environment, particularly at religious or traditional places.',
          ],
          [
            'Ayez des dirhams sur vous. Les cartes passent dans beaucoup d’hôtels, de restaurants et de boutiques modernes, mais le cash reste utile pour les petites dépenses, la cuisine locale, les taxis, les petites boutiques et les marchés. Gardez des petites coupures, surtout dans la médina.',
            'Vous marcherez probablement plus que prévu. Les rues peuvent être irrégulières, avec des marches, des pentes et des passages étroits. Choisissez des chaussures confortables pour plusieurs heures.',
            'Fès est une ville traditionnelle. Une tenue simple et pudique est le choix le plus facile. Couvrir les épaules et les genoux est une bonne façon de respecter les lieux, surtout les lieux religieux ou traditionnels.',
          ],
        ),
        images: [],
      },
      {
        heading: copy('Belongings, a SIM card, and opening hours', 'Affaires, carte SIM et horaires', 'المقتنيات وشريحة الهاتف وأوقات الفتح'),
        paragraphs: paras(
          [
            'As in any busy tourist place, keep an eye on your belongings, especially in crowded markets. Keep your phone, wallet and important items secure, and do not leave them unattended.',
            'Mobile data is useful if you are exploring independently. It helps you contact your accommodation, use maps, and reach a driver or guide. SIM cards are available from different operators. If you need one, ask your accommodation or a local contact where to buy it.',
            'Opening hours vary. Museums, monuments, shops, restaurants and markets do not all follow the same schedule, and times can change by day or season. If a place matters to you, check before you go.',
            'Friday has a different rhythm. Some businesses have different hours, and some attractions close or change their schedule. If you plan monuments, museums or traditional places on Friday, check in advance.',
          ],
          [
            'Comme dans toute ville touristique animée, surveillez vos affaires, surtout dans les marchés bondés. Gardez téléphone, portefeuille et objets importants en sécurité.',
            'Les données mobiles sont utiles si vous explorez seul. Elles aident à joindre le logement, utiliser les cartes et contacter un chauffeur ou un guide. Les cartes SIM se trouvent chez différents opérateurs. Demandez à votre logement ou à un contact local où en acheter une.',
            'Les horaires varient. Musées, monuments, boutiques, restaurants et marchés ne suivent pas tous le même rythme, et cela change selon le jour ou la saison. Si un lieu compte pour vous, vérifiez avant d’y aller.',
            'Le vendredi a un autre rythme. Certains commerces changent d’horaires, et certains sites ferment ou fonctionnent autrement. Si vous prévoyez des monuments ou des musées le vendredi, vérifiez à l’avance.',
          ],
        ),
        images: [],
      },
      {
        heading: copy('Shopping, food and photos', 'Achats, cuisine et photos', 'التسوق والطعام والصور'),
        images: [
          img('/images/tips-practical/spice-shop.webp', 800, 600, 'Visitors at a spice shop in the Medina', 'Des visiteurs dans une boutique d’épices', 'زوار في دكان توابل'),
          img('/images/tips-practical/craftsman.webp', 800, 600, 'A craftsman working at a small stall', 'Un artisan au travail sur un petit étal', 'حرفي يعمل على بسطة صغيرة'),
        ],
        paragraphs: paras(
          [
            'Shopping is part of Fez. You will find crafts, leather, textiles, ceramics, zellige, metalwork, spices and other local products. Take your time. Compare products and prices, ask questions, and understand what you are buying. If you are not interested, a friendly “no, thank you” is usually enough.',
            'Trying local food is one of the best ways to experience the city. When you choose where to eat, look for places that are busy with local customers and have a good turnover of food. Bottled water is an easy option for visitors. If you have a sensitive stomach, start slowly.',
            'Fez is full of things to photograph. People are part of that life too. Before a close-up of someone, especially a shopkeeper, craftsman or resident, ask first. If they do not want to be photographed, respect that.',
          ],
          [
            'Les achats font partie de Fès. Vous trouverez de l’artisanat, du cuir, des textiles, de la céramique, du zellige, du métal, des épices et d’autres produits locaux. Prenez le temps. Comparez, posez des questions, et comprenez ce que vous achetez. Si cela ne vous intéresse pas, un « non, merci » suffit en général.',
            'Goûter la cuisine locale est une des meilleures façons de vivre la ville. Choisissez des endroits fréquentés par les habitants, avec un bon renouvellement des plats. L’eau en bouteille est une option simple. Si vous avez l’estomac sensible, commencez doucement.',
            'Fès offre beaucoup à photographier. Les gens font partie de cette vie. Avant un gros plan, surtout d’un commerçant, d’un artisan ou d’un habitant, demandez d’abord. S’ils refusent, respectez la réponse.',
          ],
        ),
      },
      {
        heading: copy('Take breaks, and stay flexible', 'Faites des pauses, et restez souple', 'خذوا استراحة، وابقوا مرنين'),
        paragraphs: paras(
          [
            'Do not try to see everything in one day. The Old Medina is large, and several hours of walking can be tiring, especially in warmer months. Stop for tea, sit in a small café, enjoy a quiet courtyard, or watch the city. Some of the best moments happen when you are not rushing.',
            'A shop may be closed, a street may be busier than expected, or your plans may change. Leave space in the schedule. A little patience, respect and curiosity go a long way. If you are unsure, ask your hotel, guide or a trusted local contact.',
            'If you have a question about your visit, places to see, local customs or how to organise your time, contact us. Travel with useful information. Explore with confidence. Experience Fez through local eyes.',
          ],
          [
            'N’essayez pas de tout voir en un jour. La vieille médina est grande, et plusieurs heures de marche fatiguent, surtout quand il fait chaud. Arrêtez-vous pour un thé, asseyez-vous dans un café, profitez d’une cour calme. Certains des meilleurs moments arrivent quand on ne court pas.',
            'Une boutique peut être fermée, une rue plus animée que prévu, ou vos plans peuvent changer. Laissez de la place. Un peu de patience, de respect et de curiosité suffit. En cas de doute, demandez à votre hôtel, à votre guide ou à un contact local de confiance.',
            'Si vous avez une question sur la visite, les lieux, les usages ou l’organisation de votre temps, contactez-nous. Voyagez avec des informations utiles. Explorez avec confiance. Découvrez Fès à travers des yeux locaux.',
          ],
        ),
        images: [],
      },
    ],
  },
];
