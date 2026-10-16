import type { Language } from '../types';

export const WORKSPACES = ['sections', 'page', 'content', 'photos', 'appearance', 'settings', 'history'] as const;
export type Workspace = typeof WORKSPACES[number];
export type EditorLayout = 'split' | 'editor' | 'preview';
const copy: Record<string, [string, string, string]> = {
 legacyHero: ['Archived hero settings (read only)', 'Anciens réglages d’introduction (lecture seule)', 'Ajustes antiguos de cabecera (solo lectura)'],
 legacyHeroHelp: ['These values are retained for compatibility, not used by CMS pages. To change the homepage introduction, choose Home → Page sections → Introduction / hero.', 'Ces valeurs sont conservées pour compatibilité. Pour modifier l’introduction, choisissez Accueil → Sections de la page → Introduction.', 'Estos valores se conservan por compatibilidad. Para cambiar la cabecera, elige Inicio → Secciones de página → Introducción.'],
 variantPhotoHelp: ['This layout does not display a photo. Choose a photo-enabled layout under Layout to show it.', 'Cette mise en page n’affiche pas de photo. Choisissez une disposition avec photo dans Mise en page.', 'Este diseño no muestra una foto. Elige un diseño con imagen en Diseño para mostrarla.'],
 resetCopy: ['Reset to default', 'Rétablir le texte par défaut', 'Restablecer texto predeterminado'],
 unsupportedCopy: ['Advanced / legacy keys — not automatically displayed', 'Clés avancées / anciennes — sans affichage automatique', 'Claves avanzadas / antiguas — sin visualización automática'],
 unsupportedCopyHelp: ['The labels above are connected to real website controls. These older or custom keys are kept for compatibility; editing or adding one does not create a website feature.', 'Les libellés ci-dessus sont reliés au site. Ces clés anciennes ou personnalisées sont conservées ; leur modification ne crée pas une fonction.', 'Las etiquetas anteriores están conectadas al sitio. Estas claves antiguas o personalizadas se conservan; editarlas no crea una función.'],
 sections: ['Page sections', 'Sections de la page', 'Secciones de página'],
 page: ['Page settings', 'Paramètres de page', 'Ajustes de página'],
 content: ['Experiences & stories', 'Expériences et articles', 'Experiencias y artículos'],
 photos: ['Photo library', 'Photothèque', 'Biblioteca de fotos'],
 appearance: ['Design & style', 'Design et style', 'Diseño y estilo'],
 settings: ['Site settings', 'Paramètres du site', 'Ajustes del sitio'],
 history: ['History & backups', 'Historique et sauvegardes', 'Historial y copias'],
 split: ['Split view', 'Vue partagée', 'Vista dividida'],
 editor: ['Editor only', 'Éditeur seul', 'Solo editor'],
 preview: ['Preview only', 'Aperçu seul', 'Solo vista previa'],
 pagePicker: ['Choose a page', 'Choisir une page', 'Elegir página'],
 showSection: ['Show this section', 'Afficher cette section', 'Mostrar esta sección'],
 sectionPicker: ['Choose a section', 'Choisir une section', 'Elegir una sección'],
 sectionOrder: ['Section order & actions', 'Ordre et actions des sections', 'Orden y acciones de las secciones'],
 previousPart: ['Previous part', 'Partie précédente', 'Parte anterior'],
 nextPart: ['Next part', 'Partie suivante', 'Parte siguiente'],
 allPages: ['All pages & add a page', 'Toutes les pages et ajout', 'Todas las páginas y añadir'],
 pageSearch: ['Find a page', 'Rechercher une page', 'Buscar página'],
 editorWidth: ['Editor space', 'Espace de l’éditeur', 'Espacio del editor'],
 intro: ['Choose a page. Select a section in the preview. Edit, save your draft, then publish when ready.', 'Choisissez une page et une section dans l’aperçu. Modifiez, enregistrez le brouillon, puis publiez.', 'Elige una página y una sección en la vista previa. Edita, guarda el borrador y publica cuando esté listo.'],
 sectionsHelp: ['Work on one part at a time. Click the page preview or choose a section below.', 'Modifiez une partie à la fois. Cliquez dans l’aperçu ou choisissez une section ci-dessous.', 'Trabaja una parte cada vez. Haz clic en la vista previa o elige una sección abajo.'],
 pageHelp: ['Page title, web address and search appearance. These settings do not change other pages.', 'Titre, adresse web et affichage dans les recherches. Ces réglages concernent cette page.', 'Título, dirección web y apariencia en buscadores. Estos ajustes afectan solo a esta página.'],
 contentHelp: ['Manage experiences, articles, team profiles, FAQs and real reviews. Page sections control where they appear.', 'Gérez les expériences, articles, profils, FAQ et avis authentiques. Les sections déterminent leur emplacement.', 'Gestiona experiencias, artículos, perfiles, preguntas y reseñas reales. Las secciones deciden dónde aparecen.'],
 photosHelp: ['Upload a photo or select a section to replace its image. Existing photos remain available.', 'Importez une photo ou sélectionnez une section pour remplacer son image. Les photos existantes sont conservées.', 'Sube una foto o elige una sección para sustituir su imagen. Las fotos existentes siguen disponibles.'],
 appearanceHelp: ['Colors, typography, spacing and supported styles. The live preview shows your unsaved changes.', 'Couleurs, typographie, espacement et styles. L’aperçu montre les modifications non enregistrées.', 'Colores, tipografía, espacios y estilos. La vista previa muestra tus cambios sin guardar.'],
 settingsHelp: ['Contact details, menu and footer affect the whole website.', 'Les coordonnées, le menu et le pied de page concernent tout le site.', 'Los datos de contacto, el menú y el pie afectan a todo el sitio.'],
 historyHelp: ['Restore a saved revision or export a backup. Importing a file never publishes automatically.', 'Restaurez une révision ou exportez une copie. L’import ne publie jamais automatiquement.', 'Restaura una revisión o exporta una copia. Importar nunca publica automáticamente.'],
 currentPart: ['Editing this part', 'Partie en cours', 'Editando esta parte'],
 contentTab: ['Text & content', 'Textes et contenu', 'Texto y contenido'],
 photosTab: ['Photos', 'Photos', 'Fotos'],
 layoutTab: ['Layout', 'Mise en page', 'Diseño'],
 advancedTab: ['Advanced details', 'Détails avancés', 'Detalles avanzados'],
 sectionTools: ['Section actions', 'Actions de section', 'Acciones de sección'],
 addSection: ['Add another section', 'Ajouter une section', 'Añadir otra sección'],
 replacePhoto: ['Choose an existing photo', 'Choisir une photo existante', 'Elegir una foto existente'],
 photoSearch: ['Find a photo', 'Rechercher une photo', 'Buscar foto'],
 morePhotos: ['Show more photos', 'Afficher plus de photos', 'Mostrar más fotos'],
 noPhotos: ['No matching photos.', 'Aucune photo correspondante.', 'No hay fotos coincidentes.'],
 scope: ['Changes are private until you publish.', 'Les modifications restent privées avant publication.', 'Los cambios son privados hasta que publiques.'],
 saved: ['Draft saved', 'Brouillon enregistré', 'Borrador guardado'],
 unsaved: ['Unsaved changes', 'Modifications non enregistrées', 'Cambios sin guardar'],
};
export function workspaceText(key: string, language: Language): string {
 return copy[key]?.[language === 'fr' ? 1 : language === 'es' ? 2 : 0] ?? key;
}
export function friendlySection(type: string, language: Language): string {
 const names: Record<string,[string,string,string]> = {
  hero:['Introduction / hero','Introduction','Introducción'],richText:['Text & story','Texte et récit','Texto e historia'],cardGrid:['Cards','Cartes','Tarjetas'],productGrid:['Experiences','Expériences','Experiencias'],gallery:['Photo gallery','Galerie photo','Galería de fotos'],benefits:['Highlights','Points forts','Destacados'],cta:['Call to action','Appel à l’action','Llamada a la acción'],reviews:['Guest reviews','Avis voyageurs','Reseñas'],faq:['Questions & answers','Questions et réponses','Preguntas y respuestas'],team:['Meet the team','Notre équipe','Nuestro equipo'],itinerary:['Itinerary','Itinéraire','Itinerario'],inclusions:['Included & excluded','Inclus et non inclus','Incluido y no incluido'],practicalInfo:['Practical details','Informations pratiques','Datos prácticos'],contact:['Contact','Contact','Contacto'],
 };
 return names[type]?.[language === 'fr' ? 1 : language === 'es' ? 2 : 0] ?? type;
}
