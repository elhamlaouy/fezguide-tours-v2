import type { CSSProperties } from 'react';
import type { Language } from '../types';
import { isSafeCmsUrl } from './schema';
import type { CmsDocument, CmsImage, CmsLink, CmsPage, CmsProduct, CmsTheme, Localized } from './schema';

/** Spanish is explicit; EN/FR retain their compatibility fallback. Empty lists stay empty. */
export function localizedText(value: Partial<Localized> | undefined, language: Language): string {
  if (language === 'es') return value?.es || '';
  return value?.[language] || value?.en || value?.fr || '';
}
export function localizedList(value: Partial<Localized<string[]>>, language: Language): string[] {
  if (language === 'es') return value.es ?? [];
  return value[language] ?? value.en ?? value.fr ?? [];
}
export function contentLanguage(page: CmsPage, language: Language): Language {
  // Spanish remains explicit. EN/FR follow the complete validated chain, never a silent one-hop approximation.
  if (language === 'es') return 'es';
  const seen = new Set<Language>();
  let resolved: Language = language;
  while (resolved !== 'es' && page.localeFallback?.[resolved]) {
    if (seen.has(resolved)) return language;
    seen.add(resolved);
    resolved = page.localeFallback[resolved]!;
  }
  return resolved;
}
export function isPublicPage(document: CmsDocument, page: CmsPage): boolean {
  if (!page.enabled) return false;
  if (page.kind === 'product') {
    const product = document.products.find(p => p.id === page.productId);
    if (!product || product.published === false) return false;
  }
  return !document.blogPosts.some(p => p.id === page.id && !p.published);
}
export function pageLocaleAvailable(document: CmsDocument, page: CmsPage, language: Language): boolean {
  return isPublicPage(document, page) && Boolean(localizedText(page.title, contentLanguage(page, language)).trim());
}
export function blogMetadata(document: CmsDocument, pageId: string | undefined, language: Language): string {
  const post = document.blogPosts.find(post => post.id === pageId && post.published);
  return post ? [localizedText(post.category, language), post.author, post.date, localizedText(post.readTime, language)].filter(Boolean).join(' · ') : '';
}
export function publicPage(document: CmsDocument, pageId: string | undefined): CmsPage | undefined {
  return document.pages.find(p => p.id === pageId && isPublicPage(document, p));
}
export function publicProduct(document: CmsDocument, productId: string | undefined): CmsProduct | undefined {
  return document.products.find(p => p.id === productId && p.published !== false &&
    document.pages.some(page => page.kind === 'product' && page.productId === p.id && isPublicPage(document, page)));
}
export function productPage(document: CmsDocument, product: CmsProduct): CmsPage | undefined {
  return document.pages.find(p => p.kind === 'product' && p.productId === product.id && isPublicPage(document, p));
}
export function visibleLink(document: CmsDocument, link: CmsLink): boolean {
  return link.enabled && (link.pageId !== undefined ? Boolean(publicPage(document, link.pageId)) : isSafeCmsUrl(link.href));
}
export function resolveImage(document: CmsDocument, image: CmsImage, language: Language) {
  const media = document.media.find(m => m.id === image.mediaId);
  // Editor-only copies may resolve authenticated upload previews. The document
  // validator still rejects private API URLs in saved/published content.
  if (!media || (!isSafeCmsUrl(media.src, true) && !/^\/api\/admin\/media\/upload-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(media.src))) return undefined;
  return {
    src: media.src, alt: localizedText(image.alt, language) || localizedText(media.alt, language),
    caption: image.caption === undefined ? localizedText(media.caption, language) : localizedText(image.caption, language),
    width: media.width, height: media.height,
    objectPosition: media.focalPoint ? `${media.focalPoint.x * 100}% ${media.focalPoint.y * 100}%` : undefined,
    portrait: Boolean(media.width && media.height && media.height > media.width),
  };
}
export function uiText(document: CmsDocument, key: string, language: Language, fallback: Localized): string {
  return localizedText(document.uiCopy[key] ?? fallback, language);
}

const fonts: Record<CmsTheme['font'], string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  inter: 'Inter, system-ui, sans-serif',
  'noto-sans': '"Noto Sans", system-ui, sans-serif',
};
const spacing = { compact: '2rem', comfortable: '4rem', generous: '6rem' };
const radii = { square: '0px', rounded: '1rem', pill: '2rem' };
export type CmsThemeStyle = CSSProperties & Record<`--cms-${string}`, string | number>;
/** Explicit token allowlist: no CMS values become class names or arbitrary CSS rules. */
export function themeStyle(theme: CmsTheme): CmsThemeStyle {
  const color = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const bounded = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  return {
    '--cms-primary': color(theme.colors.primary, '#005F5A'), '--cms-accent': color(theme.colors.accent, '#C84B31'),
    '--cms-background': color(theme.colors.background, '#FAF8F5'), '--cms-text': color(theme.colors.text, '#1C2524'),
    '--cms-footer': theme.colors.primary.toUpperCase() === '#005F5A' ? '#15201F' : color(theme.colors.primary, '#15201F'),
    '--cms-font': fonts[theme.font] || fonts.system, '--cms-font-scale': bounded(theme.fontScale, .8, 1.4, 1),
    '--cms-container': `${bounded(theme.containerWidth, 960, 1600, 1280)}px`,
    '--cms-section-gap': spacing[theme.spacing] || spacing.comfortable, '--cms-radius': radii[theme.radius] || radii.rounded,
    '--cms-button-radius': theme.radius === 'pill' ? '999px' : radii[theme.radius] || radii.rounded,
    '--cms-button-bg': theme.buttonVariant === 'outline' ? 'transparent' : 'var(--cms-accent)',
    '--cms-button-text': theme.buttonVariant === 'outline' ? 'var(--cms-primary)' : '#ffffff',
    '--cms-card-border': theme.cardVariant === 'flat' ? 'transparent' : '#E7E2DA',
  };
}
