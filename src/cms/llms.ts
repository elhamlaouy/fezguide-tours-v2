/**
 * /llms.txt (https://llmstxt.org): a plain Markdown map of the site for AI assistants and answer engines.
 * Built from the published CMS document on every request, like the sitemap, so it follows the owner's
 * edits without a deploy. Only public, indexable pages appear; nothing is invented beyond the content.
 */
import type { CmsDocument, CmsPage } from './schema';
import { formatPrice, isPublicPage, localizedText, pageLocaleAvailable, productPage, publicProduct } from './render-utils';
import { pagePath } from './routing';
import { isGuideArticle, pageDescription, publishedBlogPost } from './seo';

/** One line of Markdown: no newlines, and no characters that would break a link label. */
const line = (value: string) => value.replace(/\s+/g, ' ').trim();
const label = (value: string) => line(value).replace(/[[\]]/g, '');

export function buildLlmsTxt(document: CmsDocument, origin: string): string {
  const visible = document.pages.filter(page => isPublicPage(document, page) && !page.seo.noIndex && pageLocaleAvailable(document, page, 'en'));
  const url = (page: CmsPage) => `${origin}${pagePath(document, page.id, 'en')}`;
  const title = (page: CmsPage) => label(localizedText(page.title, 'en'));
  const entry = (page: CmsPage, extra = '') => {
    const description = line(pageDescription(document, page, 'en'));
    return `- [${title(page)}](${url(page)})${description || extra ? `: ${[description, extra].filter(Boolean).join(' ')}` : ''}`;
  };
  const settings = document.siteSettings;
  const name = line(settings.siteName) || 'Fez Guide Tours';
  const home = visible.find(page => page.id === 'home');
  const summary = line(localizedText(document.footer.text, 'en')) || (home ? line(pageDescription(document, home, 'en')) : '');

  // Tours: public products whose own page is public, with the price the site shows.
  const tours = document.products.flatMap(product => {
    const page = publicProduct(document, product.id) ? productPage(document, product) : undefined;
    if (!page || !visible.includes(page)) return [];
    const price = product.price ? formatPrice(product, 'en') : '';
    return [entry(page, price ? `Price: ${line(price)}.` : '')];
  });
  const tourPages = new Set(document.products.map(product => productPage(document, product)).filter(Boolean));
  const guides = visible.filter(page => isGuideArticle(document, page)).map(page => entry(page));
  const posts = visible.filter(page => publishedBlogPost(document, page)).map(page => entry(page));
  const main = visible.filter(page => !tourPages.has(page) && !isGuideArticle(document, page) && !publishedBlogPost(document, page)).map(page => entry(page));

  // FAQ answers, as shown on public pages (the same questions the FAQ structured data lists).
  const faqIds = [...new Set(visible.flatMap(page => page.sections.flatMap(section => section.enabled && section.type === 'faq' ? section.faqIds : [])))];
  const faqs = faqIds.flatMap(id => {
    const faq = document.faqs.find(item => item.id === id);
    const question = faq ? line(localizedText(faq.question, 'en')) : '';
    const answer = faq ? line(localizedText(faq.answer, 'en')) : '';
    return question && answer ? [`- **${question}** ${answer}`] : [];
  });

  const contact = [
    settings.phoneNumber && `- Phone / WhatsApp: ${line(settings.phoneNumber)}`,
    settings.email && `- Email: ${line(settings.email)}`,
    localizedText(settings.address, 'en') && `- Address: ${line(localizedText(settings.address, 'en'))}`,
    localizedText(settings.licenseBadge, 'en') && `- ${line(localizedText(settings.licenseBadge, 'en'))}`,
  ].filter(Boolean);
  const languages = (['fr', 'es'] as const).filter(language => visible.some(page => pageLocaleAvailable(document, page, language)));
  const section = (heading: string, items: (string | false | undefined)[]) => items.length ? [`## ${heading}`, '', ...items as string[], ''] : [];

  return [
    `# ${name}`, '',
    ...(summary ? [`> ${summary}`, ''] : []),
    ...(languages.length ? [`The site is in English; ${languages.map(language => ({ fr: 'French', es: 'Spanish' })[language]).join(' and ')} versions use the same paths under ${languages.map(language => `${origin}/${language}/`).join(' and ')}.`, ''] : []),
    ...section('Contact', contact),
    ...section('Main pages', main),
    ...section('Tours', tours),
    ...section('Guides', guides),
    ...section('Blog', posts),
    ...section('Frequently asked questions', faqs),
    ...section('Optional', [`- [Sitemap](${origin}/sitemap.xml): every public page in English, French and Spanish.`]),
  ].join('\n');
}
