import type { Language } from '../types';

// Owner-facing text of the blog post form (formatting toolbar, photo picker, date and cover fields). EN / FR / ES.
const copy = {
  en: {
    toolbar: 'Formatting', formattingHelp: 'Formatting help',
    hintHeading: 'Turn the line into a big heading', hintSubheading: 'Turn the line into a smaller heading',
    hintBold: 'Select some words first, then press Bold', hintItalic: 'Select some words first, then press Italic',
    hintBullets: 'Start a list with bullet points', hintNumbers: 'Start a numbered list', hintQuote: 'Show the line as a quote',
    hintLink: 'Make the selected words a link', hintPhoto: 'Insert a photo from your library',
    linkText: 'Link text', linkAddress: 'Link address', linkAddressHelp: 'A web address (https://…), a page of this site (like /our-fez-tours), an email (mailto:…) or a phone number (tel:…).',
    linkInvalid: 'This address does not look right. Use a full web address starting with https://, a page of this site starting with /, mailto:name@example.com or tel:+212600000000.',
    linkInsert: 'Insert link', cancel: 'Cancel', close: 'Close',
    photoTitle: 'Choose a photo', photoSearch: 'Search your photos', photoNone: 'No photo matches your search.', photoMore: 'Show more photos', photoUpload: 'Upload a new photo',
    photoAdded: 'Photo added to the article.', photoDescriptionFallback: 'Photo',
    previewTitle: 'Preview', previewHint: 'This is how visitors will read the article.', previewEmpty: 'Start writing: your formatted article appears here.',
    dateInvalid: 'Choose a valid date from the calendar.', dateKept: 'The saved date stays', dateLabel: 'Date',
    coverTitle: 'Cover photo', coverChange: 'Change photo', coverChoose: 'Choose a cover photo', coverChooseHelp: 'This post still uses a placeholder picture. Choose the photo visitors should see first.',
    coverCurrent: 'Current cover photo', coverUnnamed: 'Photo without description', coverUploadDone: 'Cover photo changed.', coverAddress: 'Cover photo address',
  },
  fr: {
    toolbar: 'Mise en forme', formattingHelp: 'Aide à la mise en forme',
    hintHeading: 'Transformer la ligne en grand titre', hintSubheading: 'Transformer la ligne en titre plus petit',
    hintBold: 'Sélectionnez d’abord quelques mots, puis appuyez sur Gras', hintItalic: 'Sélectionnez d’abord quelques mots, puis appuyez sur Italique',
    hintBullets: 'Commencer une liste à puces', hintNumbers: 'Commencer une liste numérotée', hintQuote: 'Afficher la ligne comme une citation',
    hintLink: 'Transformer les mots sélectionnés en lien', hintPhoto: 'Insérer une photo de votre bibliothèque',
    linkText: 'Texte du lien', linkAddress: 'Adresse du lien', linkAddressHelp: 'Une adresse web (https://…), une page de ce site (par ex. /our-fez-tours), un e-mail (mailto:…) ou un numéro de téléphone (tel:…).',
    linkInvalid: 'Cette adresse semble incorrecte. Utilisez une adresse web complète commençant par https://, une page de ce site commençant par /, mailto:nom@exemple.com ou tel:+212600000000.',
    linkInsert: 'Insérer le lien', cancel: 'Annuler', close: 'Fermer',
    photoTitle: 'Choisir une photo', photoSearch: 'Rechercher dans vos photos', photoNone: 'Aucune photo ne correspond à votre recherche.', photoMore: 'Afficher plus de photos', photoUpload: 'Ajouter une nouvelle photo',
    photoAdded: 'Photo ajoutée à l’article.', photoDescriptionFallback: 'Photo',
    previewTitle: 'Aperçu', previewHint: 'Voici comment les visiteurs liront l’article.', previewEmpty: 'Commencez à écrire : votre article mis en forme apparaît ici.',
    dateInvalid: 'Choisissez une date valide dans le calendrier.', dateKept: 'La date enregistrée est conservée', dateLabel: 'Date',
    coverTitle: 'Photo de couverture', coverChange: 'Changer la photo', coverChoose: 'Choisissez une photo de couverture', coverChooseHelp: 'Cet article utilise encore une image provisoire. Choisissez la photo que les visiteurs verront en premier.',
    coverCurrent: 'Photo de couverture actuelle', coverUnnamed: 'Photo sans description', coverUploadDone: 'Photo de couverture modifiée.', coverAddress: 'Adresse de la photo de couverture',
  },
  es: {
    toolbar: 'Formato', formattingHelp: 'Ayuda de formato',
    hintHeading: 'Convertir la línea en un título grande', hintSubheading: 'Convertir la línea en un título más pequeño',
    hintBold: 'Selecciona primero unas palabras y pulsa Negrita', hintItalic: 'Selecciona primero unas palabras y pulsa Cursiva',
    hintBullets: 'Empezar una lista con viñetas', hintNumbers: 'Empezar una lista numerada', hintQuote: 'Mostrar la línea como una cita',
    hintLink: 'Convertir las palabras seleccionadas en un enlace', hintPhoto: 'Insertar una foto de tu biblioteca',
    linkText: 'Texto del enlace', linkAddress: 'Dirección del enlace', linkAddressHelp: 'Una dirección web (https://…), una página de este sitio (como /our-fez-tours), un correo (mailto:…) o un teléfono (tel:…).',
    linkInvalid: 'Esta dirección no parece correcta. Usa una dirección web completa que empiece por https://, una página de este sitio que empiece por /, mailto:nombre@ejemplo.com o tel:+212600000000.',
    linkInsert: 'Insertar enlace', cancel: 'Cancelar', close: 'Cerrar',
    photoTitle: 'Elegir una foto', photoSearch: 'Buscar en tus fotos', photoNone: 'Ninguna foto coincide con tu búsqueda.', photoMore: 'Mostrar más fotos', photoUpload: 'Subir una foto nueva',
    photoAdded: 'Foto añadida al artículo.', photoDescriptionFallback: 'Foto',
    previewTitle: 'Vista previa', previewHint: 'Así leerán el artículo los visitantes.', previewEmpty: 'Empieza a escribir: aquí aparece tu artículo con formato.',
    dateInvalid: 'Elige una fecha válida en el calendario.', dateKept: 'Se mantiene la fecha guardada', dateLabel: 'Fecha',
    coverTitle: 'Foto de portada', coverChange: 'Cambiar foto', coverChoose: 'Elige una foto de portada', coverChooseHelp: 'Esta entrada aún usa una imagen provisional. Elige la foto que los visitantes verán primero.',
    coverCurrent: 'Foto de portada actual', coverUnnamed: 'Foto sin descripción', coverUploadDone: 'Foto de portada cambiada.', coverAddress: 'Dirección de la foto de portada',
  },
} as const;

export type BlogCopy = { [K in keyof typeof copy.en]: string };
export function blogCopy(language: Language): BlogCopy { return copy[language] ?? copy.en; }
