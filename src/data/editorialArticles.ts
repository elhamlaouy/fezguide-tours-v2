import { Language } from '../types';
import { TIP_ARTICLES } from './tipArticles';
import { PageTemplateId } from './pageTemplates';

type Copy = Record<Language, string>;

export interface EditorialImage {
  src: string;
  width: number;
  height: number;
  alt: Copy;
}

export interface EditorialSection {
  heading?: Copy;
  paragraphs: Record<Language, string[]>;
  images: EditorialImage[];
}

export interface EditorialArticle {
  id: string;
  template: PageTemplateId;
  productId?: string;
  parentLabel?: Copy;
  title: Copy;
  sections: EditorialSection[];
  cta?: {
    intro: Copy;
    lead: Copy;
    button: Copy;
    image: string;
    imageAlt: Copy;
  };
  contact?: {
    href: string;
    label: Copy;
  };
}

const copy = (en: string, fr: string, ar: string): Copy => ({ en, fr, ar });
const paras = (en: string[], fr: string[]): Record<Language, string[]> => ({ en, fr, ar: en });
const img = (src: string, width: number, height: number, en: string, fr: string, ar: string): EditorialImage => ({
  src, width, height, alt: copy(en, fr, ar),
});

const productCta = {
  intro: copy(
    'This is a private food walk for you and your group. The tastings follow what local shops are preparing that day.',
    'C’est une balade gourmande privée pour vous et votre groupe. Les dégustations suivent ce que les petites boutiques préparent ce jour-là.',
    'هذه جولة تذوق خاصة لكم ولمجموعتكم. التذوق يتبع ما تحضّره الدكاكين المحلية في ذلك اليوم.',
  ),
  lead: copy(
    'Book the private food tasting walk.',
    'Réservez la balade de dégustation privée.',
    'احجزوا جولة التذوق الخاصة.',
  ),
  button: copy(
    'Book Your Private Food Tasting Walk',
    'Réserver la balade de dégustation',
    'احجزوا جولة التذوق',
  ),
  image: '/images/food-tasting-walk/wood-oven.webp',
  imageAlt: copy('A baker working at a wood-fired oven', 'Un boulanger devant un four à bois', 'خبّاز يعمل في فرن حطبي'),
};

const FOOD_EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: 'food-tasting-walk',
    template: 'editorial-guide',
    productId: 'our-food-tours',
    title: copy('Taste Fez Through Local Eyes', 'Goûter Fès à travers des yeux locaux', 'تذوّقوا فاس بعيون أهلها'),
    sections: [
      {
        images: [img('/images/food-tasting-walk/street-sandwich.webp', 975, 1300, 'A street snack held in a Medina food shop', 'Une bouchée de rue dans une boutique de la médina', 'وجبة خفيفة من دكان في المدينة')],
        paragraphs: paras(
          [
            'To understand Fez, you should not only walk through its streets. You should taste them.',
            'Food in Fez is part of everyday life. It is found in small shops, bakeries, market stalls, traditional food places and family kitchens. It is the smell of bread coming from an oven, the sound of people ordering breakfast, the colours of spices in the market, a glass of Moroccan tea shared during a conversation, and small foods that people enjoy throughout the day.',
          ],
          [
            'Pour comprendre Fès, il ne suffit pas d’en parcourir les rues. Il faut la goûter.',
            'La cuisine de Fès fait partie de la vie quotidienne. Elle se trouve dans les petites boutiques, les fours, les étals, les lieux de restauration traditionnels et les cuisines familiales. C’est l’odeur du pain qui sort du four, le bruit des commandes du matin, les couleurs des épices, un verre de thé partagé, et les petites choses que l’on mange au fil de la journée.',
          ],
        ),
      },
      {
        heading: copy('Our food tasting walk', 'Notre balade de dégustation', 'جولة التذوق'),
        images: [img('/images/food-tasting-walk/medina-lane.webp', 975, 1300, 'A covered lane in the Fez Medina', 'Une ruelle couverte de la médina de Fès', 'زقاق مسقوف في مدينة فاس')],
        paragraphs: paras(
          [
            'Our food tasting walk takes you into this everyday side of the Medina. This is not simply a tour where you sit down for one large Moroccan meal. Instead, we walk through the old Medina and stop along the way to discover and taste different foods, snacks, sweets and local products while learning how they are connected to life in Fez.',
          ],
          [
            'La balade vous emmène dans ce quotidien de la médina. Ce n’est pas une visite où l’on s’assoit pour un grand repas. On marche dans la vieille médina et l’on s’arrête pour goûter des en-cas, des douceurs et des produits locaux, en comprenant leur place dans la vie de Fès.',
          ],
        ),
      },
      {
        heading: copy('A walk through everyday food life', 'La vie alimentaire de tous les jours', 'حياة الأكل اليومية'),
        images: [img('/images/food-tasting-walk/wood-oven.webp', 720, 480, 'A baker working at a wood-fired oven', 'Un boulanger devant un four à bois', 'خبّاز يعمل في فرن حطبي')],
        paragraphs: paras(
          [
            'As we walk through the Medina, you will see a different side of the city. We pass through traditional streets and local food areas, where people shop for ingredients, meet friends, buy something to eat or simply continue their daily routine.',
            'You may see traditional bakeries, food shops, spice sellers, small stalls and places where locals stop for a quick bite. The idea is to experience food where it belongs — among the streets and people of the Medina.',
            'The Medina itself is part of the experience. Its narrow streets, traditional shops and busy markets create the setting for the food we taste along the way. Fez’s food culture has developed over centuries and reflects the city’s long history and different cultural influences.',
          ],
          [
            'En marchant, vous voyez un autre visage de la ville. On traverse des rues et des quartiers où l’on achète des ingrédients, où l’on retrouve des amis, où l’on prend une bouchée, ou où l’on continue simplement sa journée.',
            'Vous pouvez voir des fours, des boutiques, des vendeurs d’épices, de petits étals et des endroits où les habitants s’arrêtent. L’idée est de goûter la cuisine là où elle vit, parmi les rues et les gens.',
            'La médina fait partie de l’expérience. Ses ruelles, ses boutiques et ses marchés sont le décor de ce que l’on goûte. La culture alimentaire de Fès s’est construite sur des siècles et reflète la longue histoire de la ville.',
          ],
        ),
      },
      {
        heading: copy('What will you taste?', 'Que va-t-on goûter ?', 'ماذا ستتذوقون؟'),
        images: [img('/images/food-tasting-walk/pastries-tea.webp', 800, 1067, 'Pastries and mint tea on a woven mat', 'Pâtisseries et thé à la menthe sur une natte', 'حلويات وشاي بالنعناع على حصير')],
        paragraphs: paras(
          [
            'The tastings are a mixture of sweet and savoury foods, drinks and everyday Moroccan specialities. Depending on the day, season and availability, you may taste harcha, baghrir, chebakia, sweet and salty local cheeses, Moroccan mint tea, walnuts, seasonal juices, sfenj, bissara, zamgawiya, fried fish, liver prepared with chermoula, maakouda, and other seasonal foods connected to Fassi food culture.',
            'The exact selection is not fixed. Food is seasonal, and local shops do not always prepare the same things every day. That is part of the experience. We want you to taste what is available and being enjoyed locally, rather than a fixed menu created only for tourists.',
          ],
          [
            'Les dégustations mêlent le sucré, le salé, les boissons et les spécialités du quotidien. Selon le jour, la saison et ce qui est disponible, vous pouvez goûter la harcha, le baghrir, la chebakia, des fromages locaux sucrés ou salés, le thé à la menthe, des noix, des jus de saison, le sfenj, la bissara, la zamgawiya, du poisson frit, du foie à la chermoula, la maakouda, et d’autres produits de saison liés à la cuisine fassie.',
            'La sélection n’est pas fixe. La cuisine est de saison, et les boutiques ne préparent pas toujours la même chose. C’est une partie de l’expérience. On veut vous faire goûter ce que les habitants mangent ce jour-là, pas un menu figé pour les touristes.',
          ],
        ),
      },
      {
        heading: copy('More than just tasting', 'Plus que la dégustation', 'أكثر من التذوق'),
        images: [img('/images/food-tasting-walk/mint-tea.webp', 731, 1300, 'A glass of Moroccan mint tea', 'Un verre de thé marocain à la menthe', 'كأس شاي مغربي بالنعناع')],
        paragraphs: paras(
          [
            'During the walk, we do not simply tell you the names of the foods. We explain what you are eating, how it is traditionally prepared, when people usually eat it and how it fits into everyday Moroccan life. You can ask about the ingredients, spices, preparation and traditions behind each tasting.',
            'You will also discover how food connects with the rhythm of the Medina — breakfast, small snacks during the day, tea, sweets, market shopping and the traditional places where people buy or prepare their food. Moroccan tea is much more than a drink. It is closely connected with hospitality and social life.',
          ],
          [
            'Pendant la balade, on ne se contente pas de nommer les plats. On explique ce que vous mangez, comment on le prépare, quand on le mange, et quelle place il a dans la vie quotidienne. Vous pouvez poser des questions sur les ingrédients, les épices et les traditions.',
            'Vous voyez aussi comment la cuisine suit le rythme de la médina : le petit-déjeuner, les en-cas, le thé, les douceurs, les courses et les lieux où l’on achète ou prépare à manger. Le thé marocain est bien plus qu’une boisson. Il est lié à l’hospitalité et à la vie sociale.',
          ],
        ),
      },
      {
        heading: copy('A private and flexible walk', 'Une balade privée et souple', 'جولة خاصة ومرنة'),
        images: [img('/images/food-tasting-walk/tasting-table.webp', 719, 480, 'A traveler at a small tasting table', 'Une voyageuse à une petite table de dégustation', 'مسافرة على مائدة تذوق صغيرة')],
        paragraphs: paras(
          [
            'Fez has a particularly rich culinary heritage. Its food traditions have been influenced by the city’s long history and by Arab-Andalusian, Jewish and Amazigh traditions. You do not need to sit in an expensive restaurant to discover this. Sometimes a piece of bread, a warm sfenj, a bowl of bissara, a local sweet, a glass of tea or something fried in a small shop tells you more about everyday life.',
            'This is a private food experience, so the walk is just for you and your group. We can take our time, stop for photographs, talk with local sellers and spend longer at the places that interest you. There is no need to rush from one tasting to another.',
            'By the end of the walk, you will have tasted a variety of local foods, discovered parts of the Medina you might otherwise walk past, and learned how food fits into everyday life in Fez. Taste Fez through local eyes.',
          ],
          [
            'Fès a un patrimoine culinaire riche, marqué par sa longue histoire et par des traditions arabo-andalouses, juives et amazighes. Il n’est pas nécessaire de s’asseoir dans un restaurant cher pour le découvrir. Parfois un morceau de pain, un sfenj chaud, un bol de bissara, une douceur, un verre de thé ou un plat frit dans une petite boutique en disent plus sur la vie quotidienne.',
            'L’expérience est privée. La balade est seulement pour vous et votre groupe. On peut prendre le temps, s’arrêter pour des photos, parler avec les vendeurs et rester plus longtemps là où cela vous intéresse. Rien ne pousse à courir d’une dégustation à l’autre.',
            'À la fin, vous aurez goûté plusieurs produits locaux, vu des coins de la médina que l’on dépasse souvent, et compris comment la cuisine s’inscrit dans la vie de Fès.',
          ],
        ),
      },
    ],
    cta: productCta,
  },
  {
    id: 'food-culture-life',
    template: 'editorial-guide',
    productId: 'our-food-tours',
    title: copy('Food Is Part of Everyday Life', 'La cuisine fait partie de la vie quotidienne', 'الطعام جزء من الحياة اليومية'),
    sections: [
      {
        images: [img('/images/food-culture-life/cook-pot.webp', 800, 800, 'A cook stirring a large pot', 'Un cuisinier remue une grande marmite', 'طبّاخ يحرّك قدراً كبيراً')],
        paragraphs: paras(
          [
            'In Fez, food is not something separate from everyday life. It is part of the way people start their morning, meet friends, welcome guests, spend time with family and celebrate important occasions.',
            'To understand Fassi food culture, you have to look beyond the famous dishes. Sometimes it is a cup of Moroccan tea shared during a conversation. Sometimes it is fresh bread bought in the morning, a quick snack from a small local shop, sweets brought home for guests, or a family meal prepared slowly in the kitchen.',
          ],
          [
            'À Fès, la cuisine n’est pas séparée de la vie quotidienne. Elle fait partie du matin, des retrouvailles, de l’accueil des invités, du temps en famille et des occasions importantes.',
            'Pour comprendre la culture alimentaire fassie, il faut regarder au-delà des plats célèbres. Parfois c’est un thé partagé, du pain acheté le matin, un en-cas, des douceurs pour les invités, ou un repas de famille préparé lentement.',
          ],
        ),
      },
      {
        heading: copy('The rhythm of food in the Medina', 'Le rythme de la cuisine dans la médina', 'إيقاع الطعام في المدينة'),
        images: [img('/images/food-culture-life/fried-snack.webp', 800, 1067, 'A fried snack in front of a market stall', 'Un en-cas frit devant un étal', 'مقبلات مقلية أمام بسطة')],
        paragraphs: paras(
          [
            'The Medina has its own rhythm. In the morning, streets become active as people go to work, open their shops and buy what they need for the day. Later, people stop for a snack, buy ingredients, meet friends and continue their routines. Walking with someone who knows the area helps you notice these small changes.',
          ],
          [
            'La médina a son rythme. Le matin, les rues s’animent : on va au travail, on ouvre les boutiques, on achète ce qu’il faut pour la journée. Plus tard, on s’arrête pour un en-cas, on achète des ingrédients, on retrouve des amis. Marcher avec quelqu’un du quartier aide à voir ces petits changements.',
          ],
        ),
      },
      {
        heading: copy('Tea, hospitality and conversation', 'Le thé, l’hospitalité et la conversation', 'الشاي والضيافة والحديث'),
        images: [img('/images/food-culture-life/tea-tray.webp', 800, 1067, 'A silver tea tray with coloured glasses', 'Un plateau de thé en argent et des verres colorés', 'صينية شاي فضية وكؤوس ملوّنة')],
        paragraphs: paras(
          [
            'Moroccan tea is one of the clearest examples of the connection between food and social life. It can be offered to a guest, shared with family or enjoyed while talking with friends. In a Fassi home, offering food or tea can be a natural way of saying: welcome, sit down and stay a little longer.',
          ],
          [
            'Le thé marocain montre clairement le lien entre la cuisine et la vie sociale. On l’offre à un invité, on le partage en famille, on le boit en parlant. Dans une maison fassie, offrir à manger ou du thé peut simplement vouloir dire : soyez les bienvenus, asseyez-vous, restez un peu.',
          ],
        ),
      },
      {
        heading: copy('Food, family and special occasions', 'La famille et les occasions', 'العائلة والمناسبات'),
        images: [
          img('/images/food-culture-life/family-table.webp', 800, 1067, 'A table set with tagines and small plates', 'Une table avec tajines et petits plats', 'مائدة بطواجن وأطباق صغيرة'),
          img('/images/food-culture-life/flatbread.webp', 800, 600, 'Hands serving a flatbread', 'Des mains servent un pain plat', 'يدان تقدّمان خبزاً مسطحاً'),
        ],
        paragraphs: paras(
          [
            'Many food traditions are learned at home. Recipes can pass from parents and grandparents to younger generations, and the same dish may differ from one family to another. Some foods are prepared regularly. Others belong to weekends, gatherings, religious occasions or celebrations.',
            'Weddings, family gatherings and religious celebrations often bring people together around the table. The food matters, and so does the gathering itself — preparing, serving, sharing and spending time together.',
            'Ramadan changes the rhythm of food and family life. Preparing iftar becomes an important part of the evening. Soups, sweets, dates, drinks and other traditional foods appear on many tables, and the Medina develops a different atmosphere around this time.',
          ],
          [
            'Beaucoup de traditions s’apprennent à la maison. Les recettes passent des parents et des grands-parents aux plus jeunes, et le même plat peut changer d’une famille à l’autre. Certains plats sont du quotidien. D’autres appartiennent aux week-ends, aux réunions ou aux fêtes.',
            'Les mariages, les réunions de famille et les fêtes religieuses rassemblent les gens autour de la table. Le plat compte, et le rassemblement aussi : préparer, servir, partager et rester ensemble.',
            'Le ramadan change le rythme de la cuisine et de la vie de famille. Préparer l’iftar devient important le soir. Soupes, douceurs, dattes et boissons reviennent sur beaucoup de tables, et la médina prend une autre atmosphère.',
          ],
        ),
      },
      {
        heading: copy('Neighbours and a living food culture', 'Les voisins et une culture vivante', 'الجيران وثقافة حيّة'),
        images: [
          img('/images/food-culture-life/sweets-shop.webp', 800, 1067, 'Trays of traditional sweets in a shop', 'Des plateaux de douceurs traditionnelles', 'صوانٍ من الحلويات التقليدية'),
          img('/images/food-culture-life/vegetable-market.webp', 800, 1067, 'Shoppers in a vegetable market', 'Des acheteurs dans un marché de légumes', 'متسوّقون في سوق الخضر'),
          img('/images/food-culture-life/produce-stall.webp', 800, 450, 'A produce stall with sellers and visitors', 'Un étal de fruits et légumes', 'بسطة خضر وبائعين'),
        ],
        paragraphs: paras(
          [
            'People know the shops in their neighbourhood, recognise familiar sellers and have favourite places for particular products. A bakery, food shop or small stall can become part of the daily routine. The Medina is a neighbourhood where people continue to live, work, shop, cook and meet every day.',
            'You may see someone carrying fresh bread home, a shopkeeper preparing food, a family buying ingredients, a baker working early or friends stopping for tea. None of these things are organised for tourists. They are part of everyday life.',
            'Our food experiences help you see this side of Fez: why people eat a food, when they eat it, where they buy it, how it is prepared, and what it means in family life. Taste the food. Meet the culture. Experience Fez through local eyes.',
          ],
          [
            'Les habitants connaissent les boutiques du quartier, les vendeurs habituels et les endroits où acheter tel produit. Un four, une boutique ou un petit étal peut faire partie de la routine. La médina est un quartier où l’on vit, travaille, achète, cuisine et se retrouve chaque jour.',
            'Vous pouvez voir quelqu’un rapporter du pain, un commerçant préparer à manger, une famille choisir des ingrédients, un boulanger tôt le matin ou des amis s’arrêter pour le thé. Rien de cela n’est organisé pour les touristes.',
            'Nos expériences alimentaires aident à voir ce côté de Fès : pourquoi on mange cela, quand, où on l’achète, comment on le prépare, et ce que cela veut dire en famille.',
          ],
        ),
      },
    ],
    cta: productCta,
  },
  {
    id: 'food-markets-souks',
    template: 'editorial-guide',
    productId: 'our-food-tours',
    title: copy('Local Markets & Souks of Fez', 'Marchés et souks locaux de Fès', 'أسواق وقيساريات فاس'),
    sections: [
      {
        heading: copy('Discover the markets behind the food', 'Les marchés derrière la cuisine', 'الأسواق وراء الطعام'),
        images: [img('/images/food-markets-souks/pepper-stall.webp', 800, 903, 'Visitors at a pepper stall in a market', 'Des visiteurs devant un étal de poivrons', 'زوار أمام بسطة فلفل')],
        paragraphs: paras(
          [
            'If you want to understand food in Fez, start with the markets. Before a traditional dish reaches the table, its ingredients pass through the local markets and small shops of the Medina.',
            'Walking through these markets gives you a different way to discover Fez. You see what local people buy, where they shop, how ingredients are displayed, and how the rhythm of daily life changes through the day. This is not only about shopping. It is about seeing how food is part of everyday life.',
          ],
          [
            'Pour comprendre la cuisine de Fès, commencez par les marchés. Avant qu’un plat n’arrive à table, ses ingrédients passent par les marchés et les petites boutiques de la médina.',
            'Marcher ici donne une autre façon de voir Fès. On voit ce que les habitants achètent, où ils font leurs courses, comment les produits sont présentés, et comment la journée change. Ce n’est pas seulement du shopping. C’est voir la place de la cuisine dans la vie quotidienne.',
          ],
        ),
      },
      {
        heading: copy('A living food market', 'Un marché vivant', 'سوق حيّ'),
        images: [
          img('/images/food-markets-souks/squash-seller.webp', 800, 1200, 'A seller preparing squash at a market stall', 'Une vendeuse prépare des courges', 'بائعة تجهّز القرع'),
          img('/images/food-markets-souks/greens-market.webp', 800, 1067, 'A crowded market lane with greens', 'Une allée de marché animée', 'زقاق سوق مزدحم بالخضر'),
        ],
        paragraphs: paras(
          [
            'The markets of Fez are constantly moving. You may find vegetables and fruit, olives, herbs, spices, nuts, dried fruits, bread, cheese, fish, meat and other ingredients used in Moroccan cooking. Some shops specialise in one product. Others have served the neighbourhood for generations.',
            'For visitors, it can look like a maze. For people who live here, these streets are part of everyday life.',
          ],
          [
            'Les marchés de Fès bougent sans cesse. On y trouve légumes, fruits, olives, herbes, épices, noix, fruits secs, pain, fromage, poisson, viande et d’autres ingrédients de la cuisine marocaine. Certaines boutiques se spécialisent. D’autres servent le quartier depuis des générations.',
            'Pour un visiteur, cela peut ressembler à un labyrinthe. Pour les habitants, ces rues font partie de la vie quotidienne.',
          ],
        ),
      },
      {
        heading: copy('Spices, bread and the traditional oven', 'Épices, pain et four traditionnel', 'التوابل والخبز والفرن'),
        images: [
          img('/images/food-markets-souks/spice-tins.webp', 800, 1067, 'Tins of spices in a Medina shop', 'Des bidons d’épices dans une boutique', 'أوانٍ معدنية للتوابل في دكان'),
          img('/images/food-markets-souks/communal-oven.webp', 800, 1421, 'A traditional oven in a Medina neighbourhood', 'Un four traditionnel dans un quartier de la médina', 'فرن تقليدي في حومة بالمدينة'),
        ],
        paragraphs: paras(
          [
            'Spices are an important part of Moroccan cooking, but they are not simply decoration. People buy them according to what they are preparing, and families combine them differently. You can also see herbs, dried fruits, nuts and other ingredients that give Moroccan food its variety.',
            'Bread has an important place in everyday life. Families may prepare dough at home and take it to a local oven, while others buy fresh bread during their shopping. The smell of freshly baked bread is one of those small details that makes the Medina feel different from a tourist market.',
          ],
          [
            'Les épices comptent dans la cuisine marocaine, mais elles ne sont pas une décoration. On les achète selon le plat, et chaque famille les assemble à sa façon. On voit aussi des herbes, des fruits secs, des noix et d’autres ingrédients.',
            'Le pain a une place importante. Certaines familles préparent la pâte à la maison et l’apportent au four du quartier. D’autres achètent le pain pendant les courses. L’odeur du pain chaud est un de ces détails qui distinguent la médina d’un marché touristique.',
          ],
        ),
      },
      {
        heading: copy('From the market to the kitchen', 'Du marché à la cuisine', 'من السوق إلى المطبخ'),
        images: [img('/images/food-markets-souks/onion-prep.webp', 800, 455, 'A cook preparing onions and herbs', 'Une cuisinière prépare oignons et herbes', 'طبّاخة تجهّز البصل والأعشاب')],
        paragraphs: paras(
          [
            'The vegetables, herbs, spices, olives, nuts and other ingredients in the market are the ingredients behind Moroccan home cooking. During the experience, we can explain how they are used, what they are traditionally paired with, and how they become part of dishes prepared in Fassi homes.',
          ],
          [
            'Les légumes, herbes, épices, olives et noix du marché sont les ingrédients de la cuisine de maison. Pendant l’expérience, on peut expliquer comment on les utilise, avec quoi on les associe, et comment ils deviennent les plats des maisons fassies.',
          ],
        ),
      },
      {
        heading: copy('Different souks, different experiences', 'Des souks différents', 'أسواق مختلفة'),
        images: [
          img('/images/food-markets-souks/souk-lane.webp', 800, 1067, 'A busy souk lane in Fez', 'Une ruelle animée du souk de Fès', 'زقاق سوق حيوي في فاس'),
          img('/images/food-markets-souks/shop-doorway.webp', 800, 600, 'Visitors at the doorway of a Medina shop', 'Des visiteurs à l’entrée d’une boutique', 'زوار عند باب دكان'),
        ],
        paragraphs: paras(
          [
            'The Medina is not one single market. Different streets have traditionally been associated with different products and crafts. As you move through the souks, the atmosphere changes. One street may focus on food, another on spices, another on crafts, while nearby you may find small cafés, bakeries and everyday shops.',
            'With a local guide, you can understand what you are looking at, see places you might otherwise pass, and learn how locals shop. The experience is flexible and private, so there is time to stop, ask questions, take photographs and explore at your own pace.',
            'The markets are not simply places where tourists buy souvenirs. People come for bread, vegetables, spices, fish, meat, sweets and ingredients for dinner. Combine this with the food tasting walk and you can follow the journey from market to table.',
          ],
          [
            'La médina n’est pas un seul marché. Des rues ont longtemps été liées à des produits ou à des métiers différents. L’atmosphère change d’une rue à l’autre : nourriture, épices, artisanat, puis cafés, fours et boutiques du quotidien.',
            'Avec un guide local, on comprend ce que l’on regarde et on remarque des lieux que l’on dépasserait. L’expérience est privée et souple : il y a le temps de s’arrêter, de poser des questions, de photographier et d’aller à son rythme.',
            'Les marchés ne sont pas seulement des boutiques de souvenirs. On y vient pour le pain, les légumes, les épices, le poisson, la viande, les douceurs et les courses du dîner. Associée à la balade de dégustation, la visite suit le chemin du marché à la table.',
          ],
        ),
      },
    ],
    cta: productCta,
  },
  {
    id: 'food-traditional-fassi',
    template: 'editorial-guide',
    productId: 'our-food-tours',
    title: copy('Discover the Traditional Food of Fez', 'Découvrir la cuisine traditionnelle de Fès', 'اكتشفوا الطعام التقليدي في فاس'),
    sections: [
      {
        images: [img('/images/food-traditional-fassi/tagine-table.webp', 800, 1067, 'A table of tagines and small dishes', 'Une table de tajines et de petits plats', 'مائدة طواجن وأطباق صغيرة')],
        paragraphs: paras(
          [
            'Food in Fez has its own character. The city is known for a culinary tradition passed from one generation to another. Many recipes are connected to family kitchens, celebrations, religious occasions and the traditions of Fassi households.',
            'For us, traditional food is not simply about eating a famous Moroccan dish. It is about understanding where the food comes from, how it is prepared, when people eat it and why certain dishes have a special place in Fassi culture.',
          ],
          [
            'La cuisine de Fès a son caractère. La ville est connue pour une tradition transmise d’une génération à l’autre. Beaucoup de recettes sont liées aux cuisines familiales, aux fêtes, aux occasions religieuses et aux maisons fassies.',
            'Pour nous, la cuisine traditionnelle n’est pas seulement manger un plat célèbre. C’est comprendre d’où vient le plat, comment on le prépare, quand on le mange, et pourquoi certains plats ont une place particulière.',
          ],
        ),
      },
      {
        heading: copy('The flavours of Fassi cuisine', 'Les saveurs de la cuisine fassie', 'نكهات المطبخ الفاسي'),
        images: [img('/images/food-traditional-fassi/salad-spices.webp', 800, 1067, 'Chopped salad, herbs and spices ready for cooking', 'Salade, herbes et épices prêtes à cuisiner', 'سلطة وأعشاب وتوابل جاهزة للطبخ')],
        paragraphs: paras(
          [
            'Fassi cuisine is known for careful preparation, balanced flavours and the use of spices, herbs, dried fruits and other local ingredients. Some dishes take time. Others are simple foods that have been part of everyday life for generations.',
            'Among the traditional dishes you may discover are pastilla, tagine, harira, bissara, maakouda, liver with chermoula, traditional breads and pastries, and sweets such as chebakia. Pastilla is strongly associated with Fez. Tagine is prepared in many ways depending on the ingredients, the season and the family. Harira is enjoyed especially during Ramadan and also in many homes through the year. Bissara is a simple everyday dish made from dried beans or split peas. Maakouda is a potato-based snack. These are traditions, not one fixed menu.',
          ],
          [
            'La cuisine fassie est connue pour sa préparation soignée, ses saveurs équilibrées et l’usage des épices, des herbes, des fruits secs et d’autres ingrédients locaux. Certains plats demandent du temps. D’autres sont simples et font partie du quotidien depuis des générations.',
            'Parmi les plats que l’on peut découvrir : la pastilla, le tajine, la harira, la bissara, la maakouda, le foie à la chermoula, les pains, les pâtisseries et des douceurs comme la chebakia. La pastilla est fortement liée à Fès. Le tajine change selon les ingrédients, la saison et la famille. La harira se mange surtout pendant le ramadan, et aussi dans beaucoup de maisons le reste de l’année. La bissara est un plat simple de fèves ou de pois cassés. La maakouda est un en-cas à base de pomme de terre. Ce sont des traditions, pas un menu unique.',
          ],
        ),
      },
      {
        heading: copy('Pastilla and the Fassi table', 'La pastilla et la table fassie', 'البسطيلة والمائدة الفاسية'),
        images: [img('/images/food-traditional-fassi/pastilla.webp', 800, 1067, 'A pastilla dusted with sugar at a family table', 'Une pastilla sucrée sur une table familiale', 'بسطيلة مغطاة بالسكر على مائدة عائلية')],
        paragraphs: paras(
          [
            'Pastilla deserves a special place when talking about Fez. It is one of the dishes most closely associated with the city’s culinary heritage. Traditionally prepared with very thin pastry and a carefully prepared filling, it represents the elaborate side of Fassi cooking. Behind the dish is the time, patience and technique involved in preparing it.',
          ],
          [
            'La pastilla a une place à part quand on parle de Fès. C’est l’un des plats les plus liés au patrimoine culinaire de la ville. Préparée traditionnellement avec une pâte très fine et une garniture soignée, elle représente le côté élaboré de la cuisine fassie. Derrière le plat, il y a le temps, la patience et la technique.',
          ],
        ),
      },
      {
        heading: copy('Family, celebrations and the market', 'Famille, fêtes et marché', 'العائلة والاحتفالات والسوق'),
        images: [
          img('/images/food-traditional-fassi/herb-prep.webp', 800, 1067, 'A cook chopping herbs in a home kitchen', 'Une cuisinière hache des herbes dans une cuisine', 'طبّاخة تفرم الأعشاب في مطبخ'),
          img('/images/food-traditional-fassi/market-lane.webp', 800, 1067, 'A souk lane on the way to the kitchen ingredients', 'Une ruelle du souk, avant la cuisine', 'زقاق سوق في طريق المكونات'),
        ],
        paragraphs: paras(
          [
            'Family gatherings, weddings, religious celebrations and special occasions often bring particular dishes to the table. Recipes can differ from one family to another. That is why we prefer to talk about Fassi food traditions rather than a single fixed menu. There is no one recipe that represents every family in Fez.',
            'To understand traditional food, you also need to understand the ingredients. In the Medina, food culture begins in the markets. Spices, vegetables, olives, nuts, dried fruits, herbs and bread are bought according to what families need and what is available. The kitchen starts long before the food reaches the table.',
          ],
          [
            'Les réunions de famille, les mariages et les fêtes religieuses amènent souvent des plats particuliers. Les recettes changent d’une maison à l’autre. C’est pour cela que l’on parle de traditions fassies plutôt que d’un menu unique. Aucune recette ne représente toutes les familles de Fès.',
            'Pour comprendre la cuisine traditionnelle, il faut aussi comprendre les ingrédients. Dans la médina, la culture alimentaire commence au marché. Épices, légumes, olives, noix, fruits secs, herbes et pain s’achètent selon les besoins de la famille et selon ce qui est disponible. La cuisine commence bien avant que le plat n’arrive à table.',
          ],
        ),
      },
      {
        heading: copy('Taste the tradition', 'Goûter la tradition', 'تذوّقوا التقليد'),
        images: [img('/images/food-traditional-fassi/meal-table.webp', 800, 379, 'A meal of tagine and bread on a tiled table', 'Un repas de tajine et de pain', 'وجبة طاجين وخبز على مائدة')],
        paragraphs: paras(
          [
            'Our food experiences introduce this side of Fez in a natural way. Depending on the experience you choose, you can discover traditional dishes, local ingredients, food preparation and the stories behind the recipes. We want you to understand Moroccan food as part of everyday life — something prepared, shared and enjoyed by real families.',
            'Sometimes the best way to understand a place is not through a monument. It is through the food served at its table. Discover the flavours and traditions of Fez through local eyes.',
          ],
          [
            'Nos expériences présentent ce côté de Fès simplement. Selon l’expérience choisie, on découvre des plats, des ingrédients, une préparation et les histoires derrière les recettes. On veut que la cuisine marocaine se comprenne comme une part de la vie quotidienne, préparée et partagée par de vraies familles.',
            'Parfois, la meilleure façon de comprendre un lieu n’est pas un monument. C’est le plat servi à sa table.',
          ],
        ),
      },
    ],
    cta: productCta,
  },
];

export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  ...FOOD_EDITORIAL_ARTICLES,
  ...(TIP_ARTICLES as EditorialArticle[]),
];

export const editorialArticleById = (id: string) => EDITORIAL_ARTICLES.find((article) => article.id === id);
