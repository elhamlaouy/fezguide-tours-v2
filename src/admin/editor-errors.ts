import type { CmsDocument } from '../cms/schema';
import type { Language } from '../types';
import { editorLabel } from './editor-labels';
import { friendlySection, languageName } from './editor-workspace';
import { isLanguageKey, itemName, languageIndex, numberedLabel } from './editor-names';
import { SUPPORTED_UI_COPY } from '../cms/ui-copy';
import { uiCopyLabel } from './ui-copy-registry';

type Trio = readonly [string, string, string];

const retry: Trio = ['Please try again in a moment. If it keeps happening, contact support and mention the code shown when you hover over this message.', 'Réessayez dans un instant. Si le problème continue, contactez l’assistance en indiquant le code affiché au survol de ce message.', 'Inténtalo de nuevo en un momento. Si sigue ocurriendo, contacta con soporte e indica el código que aparece al pasar el cursor por este mensaje.'];
const generic = (en: string, fr: string, es: string): Trio => [`${en} ${retry[0]}`, `${fr} ${retry[1]}`, `${es} ${retry[2]}`];

/** Every code the API (or the browser) can hand back, in plain language. The page keeps the user's edits in all these cases. */
export const API_ERROR_MESSAGES: Record<string, Trio> = {
  unauthorized: ['Your session expired — sign in again in a new tab, then click Save again. Your changes are still here.', 'Votre session a expiré — reconnectez-vous dans un nouvel onglet, puis cliquez de nouveau sur Enregistrer. Vos modifications sont toujours là.', 'Tu sesión ha caducado: vuelve a iniciar sesión en una pestaña nueva y pulsa Guardar otra vez. Tus cambios siguen aquí.'],
  forbidden_origin: ['This change was blocked for security reasons. Open the editor again from fezguidetours.com/admin in a new tab, then click Save again. Your changes are still here.', 'Cette modification a été bloquée pour des raisons de sécurité. Rouvrez l’éditeur depuis fezguidetours.com/admin dans un nouvel onglet, puis cliquez de nouveau sur Enregistrer. Vos modifications sont toujours là.', 'Este cambio se ha bloqueado por seguridad. Abre el editor de nuevo desde fezguidetours.com/admin en una pestaña nueva y pulsa Guardar otra vez. Tus cambios siguen aquí.'],
  version_conflict: ['Someone else saved at the same time (edit conflict), so we loaded the latest version instead of overwriting it. Your last edits were not saved — please make them again.', 'Quelqu’un d’autre a enregistré en même temps (conflit de modification) : nous avons chargé la dernière version au lieu de l’écraser. Vos dernières modifications n’ont pas été enregistrées — refaites-les.', 'Otra persona ha guardado a la vez (conflicto de edición), así que hemos cargado la última versión en lugar de sobrescribirla. Tus últimos cambios no se guardaron: vuelve a hacerlos.'],
  invalid_document: ['Some fields are not valid, so nothing was saved. Check the fields named in the list and try again.', 'Certains champs ne sont pas valides, rien n’a été enregistré. Vérifiez les champs indiqués dans la liste puis réessayez.', 'Algunos campos no son válidos, así que no se ha guardado nada. Revisa los campos de la lista e inténtalo de nuevo.'],
  document_too_large: ['The website content is too big to save. Remove some long text or unused photo descriptions, then try again.', 'Le contenu du site est trop volumineux pour être enregistré. Supprimez des textes trop longs ou des descriptions de photos inutiles, puis réessayez.', 'El contenido de la web es demasiado grande para guardarse. Quita textos muy largos o descripciones de fotos que no uses e inténtalo de nuevo.'],
  cms_revision_storage_budget: ['The saved-versions history is full, so this save was stopped. Your changes are still here and nothing was lost. Please contact support, then click Save again.', 'L’historique des versions enregistrées est plein, l’enregistrement a donc été arrêté. Vos modifications sont toujours là et rien n’est perdu. Contactez l’assistance, puis cliquez de nouveau sur Enregistrer.', 'El historial de versiones guardadas está lleno, así que se ha detenido el guardado. Tus cambios siguen aquí y no se ha perdido nada. Contacta con soporte y pulsa Guardar otra vez.'],
  cms_request_rate: ['You are saving too often. Wait about a minute, then try again. Your changes are still here.', 'Vous enregistrez trop souvent. Attendez environ une minute, puis réessayez. Vos modifications sont toujours là.', 'Estás guardando con demasiada frecuencia. Espera un minuto e inténtalo de nuevo. Tus cambios siguen aquí.'],
  cms_public_rate: ['Too many requests in a short time. Wait a minute, then try again.', 'Trop de demandes en peu de temps. Attendez une minute, puis réessayez.', 'Demasiadas solicitudes en poco tiempo. Espera un minuto e inténtalo de nuevo.'],
  cms_unavailable: ['The content service is temporarily unavailable. Wait a moment and try again. Your changes are still here.', 'Le service de contenu est momentanément indisponible. Patientez un instant puis réessayez. Vos modifications sont toujours là.', 'El servicio de contenido no está disponible temporalmente. Espera un momento e inténtalo de nuevo. Tus cambios siguen aquí.'],
  request_too_large: ['That is too much data to send in one go. Remove some content or a large photo and try again.', 'Il y a trop de données à envoyer d’un coup. Retirez du contenu ou une grande photo puis réessayez.', 'Son demasiados datos para enviar de una vez. Quita contenido o una foto grande e inténtalo de nuevo.'],
  unsupported_media_type: ['That file type is not supported. Photos must be JPEG, PNG or WebP; backups must be JSON.', 'Ce type de fichier n’est pas pris en charge. Les photos doivent être en JPEG, PNG ou WebP ; les sauvegardes en JSON.', 'Este tipo de archivo no es compatible. Las fotos deben ser JPEG, PNG o WebP; las copias de seguridad, JSON.'],
  unsupported_encoding: generic('The browser sent the data in a format the site cannot read.', 'Le navigateur a envoyé les données dans un format que le site ne sait pas lire.', 'El navegador envió los datos en un formato que el sitio no puede leer.'),
  invalid_json: generic('The data could not be read.', 'Les données n’ont pas pu être lues.', 'No se pudieron leer los datos.'),
  invalid_request: generic('The request was not understood.', 'La demande n’a pas été comprise.', 'No se entendió la solicitud.'),
  invalid_pagination: generic('The list could not be loaded.', 'La liste n’a pas pu être chargée.', 'No se pudo cargar la lista.'),
  invalid_version: generic('The version number is not valid.', 'Le numéro de version n’est pas valide.', 'El número de versión no es válido.'),
  invalid_actor: ['Your sign-in details could not be read. Sign in again in a new tab, then try again. Your changes are still here.', 'Vos informations de connexion n’ont pas pu être lues. Reconnectez-vous dans un nouvel onglet puis réessayez. Vos modifications sont toujours là.', 'No se pudieron leer tus datos de acceso. Vuelve a iniciar sesión en una pestaña nueva e inténtalo de nuevo. Tus cambios siguen aquí.'],
  method_not_allowed: generic('That action is not available.', 'Cette action n’est pas disponible.', 'Esa acción no está disponible.'),
  not_found: ['We could not find what was asked for. Reload the editor and try again.', 'Nous n’avons pas trouvé ce qui était demandé. Rechargez l’éditeur puis réessayez.', 'No hemos encontrado lo solicitado. Vuelve a cargar el editor e inténtalo de nuevo.'],
  draft_missing: ['There is no saved draft to publish yet. Click Save draft first, then Publish.', 'Il n’y a pas encore de brouillon enregistré à publier. Cliquez d’abord sur Enregistrer le brouillon, puis sur Publier.', 'Todavía no hay un borrador guardado para publicar. Pulsa primero Guardar borrador y luego Publicar.'],
  revision_not_found: ['That version number does not exist. Choose one from the list of saved versions.', 'Ce numéro de version n’existe pas. Choisissez-en un dans la liste des versions enregistrées.', 'Ese número de versión no existe. Elige uno de la lista de versiones guardadas.'],
  invalid_image: ['This photo could not be read. Use a normal JPEG, PNG or WebP photo (not animated) and try again.', 'Cette photo n’a pas pu être lue. Utilisez une photo JPEG, PNG ou WebP classique (non animée) puis réessayez.', 'No se pudo leer esta foto. Usa una foto JPEG, PNG o WebP normal (no animada) e inténtalo de nuevo.'],
  invalid_media_metadata: ['The photo description is not valid. Check the description and try again.', 'La description de la photo n’est pas valide. Vérifiez-la puis réessayez.', 'La descripción de la foto no es válida. Revísala e inténtalo de nuevo.'],
  invalid_upload_reservation: generic('The photo upload could not be started.', 'L’envoi de la photo n’a pas pu démarrer.', 'No se pudo iniciar la subida de la foto.'),
  media_too_large: ['This photo is too large (maximum 8 MB, 12 million pixels). Make it smaller and try again.', 'Cette photo est trop lourde (maximum 8 Mo, 12 millions de pixels). Réduisez-la puis réessayez.', 'Esta foto es demasiado grande (máximo 8 MB, 12 millones de píxeles). Redúcela e inténtalo de nuevo.'],
  media_storage_budget: ['Photo storage is full, so this photo was not added. Please contact support.', 'Le stockage des photos est plein, cette photo n’a donc pas été ajoutée. Contactez l’assistance.', 'El almacenamiento de fotos está lleno, así que no se añadió esta foto. Contacta con soporte.'],
  media_upload_rate: ['You are uploading photos too quickly. Wait a minute, then try again.', 'Vous envoyez des photos trop vite. Attendez une minute, puis réessayez.', 'Estás subiendo fotos demasiado rápido. Espera un minuto e inténtalo de nuevo.'],
  media_unavailable: ['Photo storage is temporarily unavailable. Wait a moment and try again.', 'Le stockage des photos est momentanément indisponible. Patientez un instant puis réessayez.', 'El almacenamiento de fotos no está disponible temporalmente. Espera un momento e inténtalo de nuevo.'],
  media_budget_unavailable: ['Photo storage is temporarily unavailable. Wait a moment and try again.', 'Le stockage des photos est momentanément indisponible. Patientez un instant puis réessayez.', 'El almacenamiento de fotos no está disponible temporalmente. Espera un momento e inténtalo de nuevo.'],
  media_inventory_unavailable: ['The photo list could not be checked right now. Wait a moment and try again.', 'La liste des photos n’a pas pu être vérifiée pour le moment. Patientez un instant puis réessayez.', 'No se pudo comprobar la lista de fotos ahora. Espera un momento e inténtalo de nuevo.'],
  inventory_too_large: ['There are too many photos to back up in one go. Please contact support.', 'Il y a trop de photos pour une seule sauvegarde. Contactez l’assistance.', 'Hay demasiadas fotos para una sola copia de seguridad. Contacta con soporte.'],
  invalid_backup: ['This file is not a valid backup of the website content. Choose a backup exported from this editor.', 'Ce fichier n’est pas une sauvegarde valide du contenu du site. Choisissez une sauvegarde exportée depuis cet éditeur.', 'Este archivo no es una copia de seguridad válida del contenido. Elige una copia exportada desde este editor.'],
  backup_too_large: ['This backup is too big to handle. Please contact support.', 'Cette sauvegarde est trop volumineuse. Contactez l’assistance.', 'Esta copia de seguridad es demasiado grande. Contacta con soporte.'],
  backup_media_missing: ['The backup refers to a photo that is missing, so it cannot be used. Please contact support.', 'La sauvegarde fait référence à une photo manquante et ne peut pas être utilisée. Contactez l’assistance.', 'La copia hace referencia a una foto que falta y no se puede usar. Contacta con soporte.'],
  backup_media_hash: ['A photo in the backup does not match the original, so the backup cannot be used. Please contact support.', 'Une photo de la sauvegarde ne correspond pas à l’original, la sauvegarde ne peut donc pas être utilisée. Contactez l’assistance.', 'Una foto de la copia no coincide con la original, así que no se puede usar. Contacta con soporte.'],
  network_error: ['Cannot reach the website. Check your internet connection and try again. Your changes are still here.', 'Impossible de joindre le site. Vérifiez votre connexion internet puis réessayez. Vos modifications sont toujours là.', 'No se puede conectar con el sitio. Comprueba tu conexión a internet e inténtalo de nuevo. Tus cambios siguen aquí.'],
  load_failed: ['The editor could not load the website content. Check your connection and reload.', 'L’éditeur n’a pas pu charger le contenu du site. Vérifiez votre connexion puis rechargez.', 'El editor no pudo cargar el contenido de la web. Comprueba tu conexión y vuelve a cargar.'],
  invalid_response: generic('The site answered in an unexpected way.', 'Le site a répondu de façon inattendue.', 'El sitio respondió de forma inesperada.'),
  request_failed: generic('Something went wrong.', 'Un problème est survenu.', 'Algo salió mal.'),
  save_failed: ['The draft could not be saved. Your changes are still here. Check your connection and click Save draft again.', 'Le brouillon n’a pas pu être enregistré. Vos modifications sont toujours là. Vérifiez votre connexion puis cliquez de nouveau sur Enregistrer.', 'No se pudo guardar el borrador. Tus cambios siguen aquí. Comprueba tu conexión y pulsa Guardar borrador otra vez.'],
  publish_failed: ['Publishing did not work. Your draft is safe. Check your connection and click Publish again.', 'La publication n’a pas abouti. Votre brouillon est en sécurité. Vérifiez votre connexion puis cliquez de nouveau sur Publier.', 'No se pudo publicar. Tu borrador está a salvo. Comprueba tu conexión y pulsa Publicar otra vez.'],
  rollback_failed: ['The earlier version could not be restored. Nothing was changed. Try again in a moment.', 'La version précédente n’a pas pu être restaurée. Rien n’a été modifié. Réessayez dans un instant.', 'No se pudo restaurar la versión anterior. No se ha cambiado nada. Inténtalo de nuevo en un momento.'],
};

/** Explanations for field validation messages produced by the schema and the editor itself. */
const VALIDATION_MESSAGES: Record<string, Trio> = {
  'invalid or oversized string': ['This text is not valid or is too long.', 'Texte non valide ou trop long.', 'Texto no válido o demasiado largo.'],
  'expected boolean': ['Choose yes or no.', 'Choisissez oui ou non.', 'Selecciona sí o no.'],
  'number out of range': ['This number is outside the allowed range.', 'Nombre hors de la plage autorisée.', 'Número fuera del intervalo permitido.'],
  'unsupported value': ['This choice is not supported.', 'Valeur non prise en charge.', 'Valor no admitido.'],
  'expected object': ['This content block is missing.', 'Bloc de contenu manquant.', 'Falta este bloque de contenido.'],
  'unknown field': ['This field is not supported.', 'Champ non pris en charge.', 'Campo no admitido.'],
  'expected bounded array': ['This list is not valid or is too long.', 'Liste non valide ou trop longue.', 'Lista no válida o demasiado larga.'],
  'unsafe URL': ['This link is not safe or not supported. Use a normal web address starting with https://.', 'Lien non sûr ou non pris en charge. Utilisez une adresse web normale commençant par https://.', 'Enlace no seguro o no admitido. Usa una dirección web normal que empiece por https://.'],
  'missing reference': ['The item this points to no longer exists. Remove it from the lists that use it first.', 'L’élément visé n’existe plus. Retirez-le d’abord des listes qui l’utilisent.', 'El elemento al que apunta ya no existe. Quítalo primero de las listas que lo usan.'],
  'duplicate identifier': ['This internal ID is already used.', 'Cet identifiant est déjà utilisé.', 'Este identificador ya está en uso.'],
  'reserved slug': ['This address is reserved. Choose another.', 'Cette adresse est réservée. Choisissez-en une autre.', 'Esta dirección está reservada. Elige otra.'],
  'use a lowercase slug': ['Use only lowercase letters, numbers and dashes, with no spaces.', 'Utilisez uniquement des minuscules, des chiffres et des tirets, sans espaces.', 'Usa solo minúsculas, números y guiones, sin espacios.'],
  'already used': ['This address is already used by another page.', 'Cette adresse est déjà utilisée par une autre page.', 'Esta dirección ya la usa otra página.'],
  'enter a revision id': ['Enter a valid version number.', 'Saisissez un numéro de version valide.', 'Introduce un número de versión válido.'],
  'exceeds byte limit': ['The content is too big to save.', 'Le contenu est trop volumineux pour être enregistré.', 'El contenido es demasiado grande para guardarse.'],
  'attribution records are read-only': ['Review texts and authors cannot be edited. You can only show, hide or reorder them.', 'Les textes et auteurs des avis ne sont pas modifiables. Vous pouvez seulement les afficher, masquer ou réordonner.', 'Los textos y autores de las reseñas no se pueden editar. Solo puedes mostrarlas, ocultarlas o reordenarlas.'],
  'home cannot be removed': ['The home page cannot be removed.', 'La page d’accueil ne peut pas être supprimée.', 'La página de inicio no se puede eliminar.'],
  'invalid dictionary key': ['This text name is not valid or is already used.', 'Ce nom de texte n’est pas valide ou est déjà utilisé.', 'Este nombre de texto no es válido o ya está en uso.'],
};
const FALLBACK_VALIDATION: Trio = ['This field is not valid. Check it before saving.', 'Contenu non valide. Vérifiez ce champ avant d’enregistrer.', 'Contenido no válido. Revisa este campo antes de guardar.'];
const IMAGE_UNKNOWN: Trio = ['Photo not found in the library: ', 'Image introuvable dans la photothèque : ', 'Foto no encontrada en la biblioteca: '];
const PAGE_WORD: Trio = ['Page', 'Page', 'Página'];
const SECTION_WORD: Trio = ['Section', 'Section', 'Sección'];

export function isKnownErrorCode(code: string): boolean { return Object.hasOwn(API_ERROR_MESSAGES, code); }
/** Friendly sentence for an API/network error code (never the raw code). */
export function friendlyApiError(code: string, language: Language): string {
  return (isKnownErrorCode(code) ? API_ERROR_MESSAGES[code] : API_ERROR_MESSAGES.request_failed)[languageIndex(language)];
}

/**
 * Turns `pages.home.sections.hero.title.en` into words: Page “Home” › Section “Welcome” › Title › English.
 * Lists count from 1 and carry each item's own name; ids resolve to names; unknown parts fall back to the label table.
 */
export function describeFieldPath(path: string, document: CmsDocument | undefined, language: Language): string {
  // The validator reports `document.pages[0].title.es`; the editor's own checks use plain dotted paths.
  const normalized = path.replace(/^document(?=\.|$)\.?/, '').replace(/\[(\d+)\]/g, '.$1');
  if (!normalized) return editorLabel('document', language);
  const segments = normalized.split('.');
  const index = languageIndex(language);
  if (segments[0] === 'uiCopy' && segments.length > 1) {
    const last = segments.at(-1)!;
    const hasLanguage = segments.length > 2 && isLanguageKey(last);
    const key = segments.slice(1, hasLanguage ? -1 : undefined).join('.');
    return [editorLabel('uiCopy', language), uiCopyLabel(key, SUPPORTED_UI_COPY, language), ...(hasLanguage ? [languageName(last as Language)] : [])].join(' › ');
  }
  const parts: string[] = [];
  let node: unknown = document;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (Array.isArray(node)) {
      const parent = segments[i - 1];
      const byId = !/^\d+$/.test(segment);
      const position = byId ? node.findIndex(item => (item as { id?: string } | undefined)?.id === segment) : Number(segment);
      const item = node[position];
      const name = itemName(item, language);
      if (parent === 'pages') parts.push(`${PAGE_WORD[index]} “${name || segment}”`);
      else if (parent === 'sections') parts.push(`${SECTION_WORD[index]} “${name || (item ? friendlySection(String((item as { type?: string }).type), language) : segment)}”`);
      else parts.push(position >= 0 ? numberedLabel(position, name, language) : segment);
      node = item;
      continue;
    }
    if (/^\d+$/.test(segment)) { parts.push(numberedLabel(Number(segment), '', language)); node = undefined; continue; }
    if (isLanguageKey(segment) && node && typeof node === 'object') { parts.push(languageName(segment as Language)); node = (node as Record<string, unknown>)[segment]; continue; }
    if (!(i === 0 && segment === 'pages') && segment !== 'sections') parts.push(editorLabel(segment, language));
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined;
  }
  return parts.join(' › ');
}

export interface DescribedError { text: string; code: string }
/**
 * `raw` is either a bare code (`cms_revision_storage_budget`) or `field.path: validator message`.
 * `code` is the original raw text, kept for support (title / data-code attributes).
 */
export function describeEditorError(raw: string, language: Language, document?: CmsDocument): DescribedError {
  const separator = raw.indexOf(': ');
  if (separator < 0) return { text: friendlyApiError(raw, language), code: raw };
  const path = raw.slice(0, separator);
  const message = raw.slice(separator + 2);
  const index = languageIndex(language);
  const explanation = message.startsWith('unknown id ') ? `${IMAGE_UNKNOWN[index]}${message.slice(11)}` : (VALIDATION_MESSAGES[message] ?? FALLBACK_VALIDATION)[index];
  return { text: `${describeFieldPath(path, document, language)}: ${explanation}`, code: raw };
}
export function editorError(raw: string, language: Language, document?: CmsDocument): string {
  return describeEditorError(raw, language, document).text;
}
