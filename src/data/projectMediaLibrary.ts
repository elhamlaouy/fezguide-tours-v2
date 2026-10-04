export interface MediaItem {
  path: string;
  name: string;
  category: 'medina' | 'daytrips' | 'food' | 'team' | 'tips' | 'hero';
}

export const PROJECT_MEDIA_LIBRARY: MediaItem[] = [
  // Top Highlights & Hero Images
  { path: '/images/hero_fez_medina_1790709688133.jpg', name: 'Fez Medina Panoramic Skyline', category: 'hero' },
  { path: '/images/fez_tannery_chouara_1790709709409.jpg', name: 'Chouara Tannery Dye Vats', category: 'hero' },
  { path: '/images/chefchaouen_daytrip_1790709699413.jpg', name: 'Chefchaouen Blue Pearl Medina', category: 'hero' },
  { path: '/images/meknes_volubilis_roman_1790709730115.jpg', name: 'Volubilis Roman Mosaic Ruins', category: 'hero' },
  { path: '/images/moroccan_food_tasting_1790709719867.jpg', name: 'Moroccan Medina Street Tasting', category: 'hero' },

  // Medina & Heritage
  { path: '/images/real/fez_explore_medina_image1.jpg', name: 'Bab Boujloud Blue Gate Exterior', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image2.jpg', name: 'Al-Qarawiyyin Courtyard & Tiles', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image3.jpg', name: 'Bou Inania Medersa Woodwork', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image4.jpg', name: 'Chouara Tannery Traditional Leather', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image5.jpg', name: 'Attarine Souk Spice Pyramids', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image6.jpg', name: 'Nejjarine Museum of Wooden Arts', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image7.jpg', name: 'Seffarine Copper Brass Artisan Square', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image8.jpg', name: 'Fez Medina Labyrinth Alleys', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image9.jpg', name: 'Marinid Tombs Panoramic Sunset View', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image10.jpg', name: 'Fassi Mosaic Zellige Tile Master', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image11.jpg', name: 'Royal Palace Seven Golden Brass Gates', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image12.jpg', name: 'Mellah Historic Jewish Quarter', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image13.jpg', name: 'Medina Communal Bakery & Wood Oven', category: 'medina' },
  { path: '/images/real/fez_explore_medina_image14.jpg', name: 'Al-Attarine Medersa Ornate Archways', category: 'medina' },
  { path: '/images/fez_medina_bread_alley_walk_1791028852376.jpg', name: 'Medina Bread & Craft Alley Walk', category: 'medina' },
  { path: '/images/fez_spice_souk_attarine_1791028863908.jpg', name: 'Souk Attarine Perfumes & Herbs', category: 'medina' },
  { path: '/images/real/fez_history_culture_image1.jpg', name: 'Ancient Fez Heritage & Architecture', category: 'medina' },
  { path: '/images/real/fez_history_culture_image2.jpg', name: 'Islamic Geometric Zellige Masterpiece', category: 'medina' },
  { path: '/images/real/fez_history_culture_image10.jpg', name: 'Historic Medina Cedar Lattice Windows', category: 'medina' },
  { path: '/images/real/fez_history_culture_image11.jpg', name: 'Ancient Fez Library Archives', category: 'medina' },
  { path: '/images/real/fez_history_culture_image12.jpg', name: 'Courtyard Fountain in Traditional Riad', category: 'medina' },
  { path: '/images/real/fez_history_culture_image13.jpg', name: 'Spiritual Sufi Zawiya Sanctuary', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image1.jpg', name: 'Medina Shopping in Souk Talaa', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image2.jpg', name: 'Traditional Hammam Steam Ritual', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image3.jpg', name: 'Pottery & Ceramics Workshop Kilns', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image4.jpg', name: 'Carpet Weaving Cooperative Loom', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image5.jpg', name: 'Leather Goods & Slippers Babouche', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image6.jpg', name: 'Fez Botanical Garden Jnan Sbil', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image7.jpg', name: 'Borj Nord Arms Museum Fortress', category: 'medina' },
  { path: '/images/real/fez_things_to_do_image8.jpg', name: 'Rooftop Mint Tea Ceremony View', category: 'medina' },

  // Day Trips & Excursions
  { path: '/images/real/daytrip_chefchaouen_image1.jpg', name: 'Chefchaouen Blue Medina Stairway', category: 'daytrips' },
  { path: '/images/real/daytrip_meknes_image1.jpg', name: 'Volubilis Triumphal Arch of Caracalla', category: 'daytrips' },
  { path: '/images/real/daytrip_meknes_image2.jpg', name: 'Moulay Idriss Zerhoun Hilltop Town', category: 'daytrips' },
  { path: '/images/real/daytrip_meknes_image3.jpg', name: 'Bab El-Mansour Grand Imperial Gate', category: 'daytrips' },
  { path: '/images/real/daytrip_meknes_image4.jpg', name: 'Heri es-Souani Royal Granaries', category: 'daytrips' },
  { path: '/images/real/daytrip_meknes_image5.jpg', name: 'Meknes Imperial Basin Agdal', category: 'daytrips' },
  { path: '/images/real/daytrip_ifrane_image1.jpg', name: 'Ifrane Mountain Chalet Architecture', category: 'daytrips' },
  { path: '/images/real/daytrip_ifrane_image2.jpg', name: 'Middle Atlas Cedar Forest & Macaques', category: 'daytrips' },
  { path: '/images/real/daytrip_ifrane_image3.jpg', name: 'Azrou Barbary Cedar Tree Trail', category: 'daytrips' },
  { path: '/images/real/daytrip_custom_image1.jpg', name: 'Private Luxury Day Trip Vehicle', category: 'daytrips' },

  // Moroccan Food & Tastings
  { path: '/images/real/food_tasting_walk_image1.jpg', name: 'Fresh Medina Street Pastilla & Briouats', category: 'food' },
  { path: '/images/real/food_traditional_fassi_image1.jpg', name: 'Royal Fassi Lamb Tagine with Prunes', category: 'food' },
  { path: '/images/real/food_markets_souks_image1.jpg', name: 'Medina Olive Barrels & Preserved Lemons', category: 'food' },
  { path: '/images/real/food_culture_life_image1.jpg', name: 'Traditional Mint Tea Pouring Art', category: 'food' },
  { path: '/images/real/food_couscous_plate.jpg', name: 'Seven Vegetable Couscous Friday Dish', category: 'food' },
  { path: '/images/real/food_feast_board.jpg', name: 'Moroccan Mezze Salad Spread', category: 'food' },
  { path: '/images/real/food_medina_walk.jpg', name: 'Warm Harcha, Msemen & Honey', category: 'food' },
  { path: '/images/real/food_spice_souk.jpg', name: 'Ras El Hanout & Pure Saffron Threads', category: 'food' },
  { path: '/images/real/food_tagine_table.jpg', name: 'Clay Pot Tagine Simmering on Charcoal', category: 'food' },
  { path: '/images/food_couscous_seven_vegetables_1791028373287.jpg', name: 'Fassi Couscous with Caramelized Onions', category: 'food' },
  { path: '/images/food_street_tasting_tagine_1791028349470.jpg', name: 'Medina Street Tagine Tasting Walk', category: 'food' },
  { path: '/images/food_traditional_fassi_feast_1791028361535.jpg', name: 'Grand Fassi Feast Dinner Table', category: 'food' },

  // Team & Guides
  { path: '/images/real/about_us_image1.jpg', name: 'Mohammed Benali - Senior Historian Guide', category: 'team' },
  { path: '/images/real/about_us_image2.jpg', name: 'Fatima Zahra - Heritage & Architecture Guide', category: 'team' },
  { path: '/images/real/about_us_image3.jpg', name: 'Youssef El Fassi - Medina & Souks Guide', category: 'team' },
  { path: '/images/real/about_us_image4.jpg', name: 'Amina Mansouri - Culinary Expert & Food Guide', category: 'team' },
  { path: '/images/real/about_us_image5.jpg', name: 'Guide with Travelers at Bab Boujloud', category: 'team' },
  { path: '/images/real/about_us_image6.jpg', name: 'Guide Explaining Zellige Tiles Craft', category: 'team' },
  { path: '/images/real/about_us_image7.jpg', name: 'Private Medina Walking Group with Guide', category: 'team' },
  { path: '/images/real/about_us_image8.jpg', name: 'Official Guides Association Briefing', category: 'team' },
  { path: '/images/real/about_us_image9.jpg', name: 'Licensed Guide Welcoming Guests at Riad', category: 'team' },
  { path: '/images/real/about_us_image10.jpg', name: 'Chefchaouen Guided Walk Portrait', category: 'team' },

  // Travel Tips
  { path: '/images/real/tips_practical_image1.jpg', name: 'Medina Walking Tips & Navigation', category: 'tips' },
  { path: '/images/real/tips_plan_trip_image1.jpg', name: 'Best Seasons & Weather for Fez', category: 'tips' },
  { path: '/images/real/tips_getting_around_image1.jpg', name: 'Petit Taxi & Airport Transfers Fez', category: 'tips' },
];
