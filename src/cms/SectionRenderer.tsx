import { businessContactHref } from './business-contact';
import { imageSizes, responsiveImageProps } from './optimized-image';
import type { ReactNode } from 'react';
import type { Language } from '../types';
import type { CmsDocument, CmsImage, CmsLink, CmsPage, CmsProduct, CmsSection, Localized } from './schema';
import { isSafeCmsUrl } from './schema';
import { blogMetadata, localizedList, localizedText, productPage, publicPage, publicProduct, resolveImage, uiText, visibleLink, pageLocaleAvailable } from './render-utils';

export interface SectionRendererProps {
  document: CmsDocument;
  page: CmsPage;
  section: CmsSection;
  language: Language;
  titleTag: 'h1' | 'h2';
  onNavigate: (pageId: string) => void;
  onBook: (productId: string) => void;
}

const TYPES = ['hero', 'richText', 'cardGrid', 'productGrid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practicalInfo', 'contact'] as const;
const VARIANTS: Record<CmsSection['type'], readonly string[]> = {
  hero: ['banner', 'split', 'minimal'],
  richText: ['story', 'panel'],
  cardGrid: ['overview', 'featured'],
  productGrid: ['overview', 'featured'],
  gallery: ['grid', 'carousel', 'story'],
  benefits: ['grid', 'strip'],
  cta: ['split', 'banner', 'booking'],
  reviews: ['marquee', 'grid'],
  faq: ['accordion', 'list'],
  team: ['grid', 'story'],
  itinerary: ['timeline', 'list'],
  inclusions: ['columns', 'list'],
  practicalInfo: ['facts', 'panel'],
  contact: ['banner', 'panel'],
};
const TYPE_CLASS: Record<CmsSection['type'], string> = {
  hero: 'cms-hero', richText: 'cms-rich-text', cardGrid: 'cms-card-grid', productGrid: 'cms-product-grid',
  gallery: 'cms-gallery', benefits: 'cms-benefits', cta: 'cms-cta', reviews: 'cms-reviews', faq: 'cms-faq',
  team: 'cms-team', itinerary: 'cms-itinerary', inclusions: 'cms-inclusions', practicalInfo: 'cms-facts', contact: 'cms-contact',
};

function knownType(type: string): type is CmsSection['type'] {
  return (TYPES as readonly string[]).includes(type);
}
function knownVariant(section: CmsSection): string | undefined {
  return knownType(section.type) && VARIANTS[section.type].includes(section.variant) ? section.variant : undefined;
}
function sectionClass(section: CmsSection): string {
  if (!knownType(section.type)) return 'cms-section';
  const variant = knownVariant(section);
  const base = TYPE_CLASS[section.type];
  return variant ? `cms-section ${base} ${base}-${variant}` : `cms-section ${base}`;
}
function domId(id: string): string | undefined {
  return /^[a-z0-9][a-z0-9-]*$/.test(id) ? id : undefined;
}

/** Booking actions exist only on the matching public product page. */
export function visibleBookingProduct(document: CmsDocument, page: CmsPage, section: CmsSection): string | undefined {
  if (section.type !== 'cta' || section.variant !== 'booking' || page.kind !== 'product') return undefined;
  if (!section.productId || section.productId !== page.productId) return undefined;
  return publicProduct(document, section.productId)?.id;
}

export function formatPrice(product: CmsProduct, language: Language): string {
  const price = product.price;
  if (!price || typeof price.amount !== 'number' || !Number.isFinite(price.amount)) return '';
  const amount = price.currency === 'EUR' ? `€${price.amount}` : price.currency === 'USD' ? `$${price.amount}` : price.currency === 'MAD' ? `${price.amount} MAD` : '';
  if (!amount) return '';
  const basis = price.basis === 'person'
    ? { en: 'per person', fr: 'par personne', es: 'por persona' }
    : price.basis === 'group'
      ? { en: 'per group', fr: 'par groupe', es: 'por grupo' }
      : price.basis === 'vehicle'
        ? { en: 'per vehicle', fr: 'par véhicule', es: 'por vehículo' }
        : undefined;
  return basis ? `${amount} ${localizedText(basis, language)}` : amount;
}

function mediaFromSrc(document: CmsDocument, src: string | undefined, language: Language, alt?: Localized) {
  if (!src) return undefined;
  const media = document.media.find(item => item.src === src);
  return media ? resolveImage(document, { mediaId: media.id, alt: alt ?? media.alt, ...(media.caption ? { caption: media.caption } : {}) }, language) : undefined;
}

function CmsImg({ document, image, language, eager, className, sizes }: { document: CmsDocument; image?: CmsImage; language: Language; eager?: boolean; className?: string; sizes?: string }) {
  const media = image ? resolveImage(document, image, language) : undefined;
  if (!media) return null;
  return (
    <img
      className={media.portrait ? `cms-img cms-img-portrait ${className ?? ''}` : `cms-img ${className ?? ''}`}
      {...responsiveImageProps(media.src, sizes ?? imageSizes(document.theme.containerWidth), Boolean(eager || className?.includes('cms-cover')))}
      alt={media.alt}
      width={media.width}
      height={media.height}
      style={media.objectPosition ? { objectPosition: media.objectPosition } : undefined}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function SafeAnchor({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (!isSafeCmsUrl(href)) return <span className={className}>{children}</span>;
  const external = href.startsWith('https://');
  const whatsapp = href.startsWith('https://wa.me/') || href.startsWith('https://api.whatsapp.com/');
  return (
    <a className={whatsapp ? `cms-button cms-button-whatsapp ${className ?? ''}` : `cms-button ${className ?? ''}`} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

function Actions({ document, links, language, onNavigate }: { document: CmsDocument; links: CmsLink[]; language: Language; onNavigate: (pageId: string) => void }) {
  const visible = links.filter(link => visibleLink(document, link) && (!link.pageId || document.pages.some(page => page.id === link.pageId && pageLocaleAvailable(document, page, language))) && localizedText(link.label, language).trim());
  if (!visible.length) return null;
  return (
    <div className="cms-actions">
      {visible.map(link => {
        const label = localizedText(link.label, language);
        if (link.pageId) {
          const pageId = link.pageId;
          return <button key={link.id} type="button" className="cms-button" data-page-id={pageId} onClick={() => onNavigate(pageId)}>{label}</button>;
        }
        return <SafeAnchor key={link.id} href={businessContactHref(document, link.href || '')}>{label}</SafeAnchor>;
      })}
    </div>
  );
}

function Heading({ section, language, titleTag, id }: { section: CmsSection; language: Language; titleTag: 'h1' | 'h2'; id?: string }) {
  const Title = titleTag;
  const eyebrow = localizedText(section.eyebrow, language);
  const title = localizedText(section.title, language);
  const description = localizedText(section.description, language);
  if (!eyebrow && !title && !description) return null;
  return (
    <header className="cms-section-head">
      {eyebrow ? <p className="cms-eyebrow">{eyebrow}</p> : null}
      {title ? <Title id={id}>{title}</Title> : null}
      {description ? <p className="cms-lead">{description}</p> : null}
    </header>
  );
}

function Hero(props: SectionRendererProps) {
  const { document, section, language, titleTag, onNavigate } = props;
  if (section.type !== 'hero') return null;
  const headingId = domId(section.id) ? `${section.id}-title` : undefined;
  const copy = (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={headingId} />
      <Actions document={document} links={section.links} language={language} onNavigate={onNavigate} />
    </>
  );
  if (section.variant === 'split') {
    return <div className="cms-split"><div className="cms-hero-copy">{copy}</div><CmsImg document={document} image={section.image} language={language} eager sizes={imageSizes(document.theme.containerWidth, 'split')} className="cms-cover" /></div>;
  }
  if (section.variant === 'minimal') return <div className="cms-hero-copy">{copy}</div>;
  return (
    <>
      <CmsImg document={document} image={section.image} language={language} eager sizes={imageSizes(document.theme.containerWidth, 'banner')} className="cms-cover" />
      <div className="cms-hero-scrim" aria-hidden="true" />
      <div className="cms-hero-card">{copy}</div>
    </>
  );
}

function RichText({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'richText') return null;
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className={section.variant === 'panel' ? 'cms-panel cms-prose' : 'cms-prose cms-prose-story'}>
        {section.blocks.map((block, index) => {
          if (block.type === 'list') {
            const items = localizedList(block.items, language).filter(Boolean);
            return items.length ? <ul key={index}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : null;
          }
          if (block.type === 'link') {
            const label = block.text[language] ?? localizedText(block.text, language);
            return label ? <p key={index}><SafeAnchor href={businessContactHref(document, block.href)}>{label}</SafeAnchor></p> : null;
          }
          const text = block.text[language] ?? localizedText(block.text, language);
          if (!text) return null;
          if (block.type === 'heading') return <h3 key={index}>{text}</h3>;
          if (block.type === 'quote') return <blockquote key={index}>{text}</blockquote>;
          return <p key={index}>{text}</p>;
        })}
      </div>
    </>
  );
}

function CardFace({ document, image, language, badge, title, description, sizes }: { document: CmsDocument; image?: CmsImage; language: Language; badge?: Localized; title: Localized; description: Localized; sizes: string }) {
  const kicker = localizedText(badge, language);
  const heading = localizedText(title, language);
  const copy = localizedText(description, language);
  return (
    <>
      <CmsImg document={document} image={image} language={language} sizes={sizes} />
      <span className="cms-card-body">
        {kicker ? <span className="cms-eyebrow">{kicker}</span> : null}
        {heading ? <span className="cms-card-title">{heading}</span> : null}
        {copy ? <span className="cms-card-copy">{copy}</span> : null}
      </span>
    </>
  );
}

function CardGrid({ document, section, language, titleTag, onNavigate }: SectionRendererProps) {
  if (section.type !== 'cardGrid') return null;
  const cards = section.cards.filter(card => card.pageId === undefined || document.pages.some(page => page.id === card.pageId && pageLocaleAvailable(document, page, language)));
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-cards">
        {cards.map(card => {
          const face = <><CardFace document={document} image={card.image} language={language} sizes={imageSizes(document.theme.containerWidth, 'card', cards.length, section.variant === 'featured', card.image ? resolveImage(document, card.image, language)?.src : undefined)} badge={card.badge} title={card.title} description={card.description} />{blogMetadata(document, card.pageId, language) && <span className="cms-meta">{blogMetadata(document, card.pageId, language)}</span>}</>;
          return card.pageId
            ? <button key={card.id} type="button" className="cms-card" data-page-id={card.pageId} onClick={() => onNavigate(card.pageId!)}>{face}</button>
            : <article key={card.id} className="cms-card">{face}</article>;
        })}
      </div>
    </>
  );
}

function ProductGrid({ document, section, language, titleTag, onNavigate }: SectionRendererProps) {
  if (section.type !== 'productGrid') return null;
  const products = section.productIds.map(id => publicProduct(document, id)).filter(product => product !== undefined).filter(product => {
    const target = productPage(document, product);
    return target && pageLocaleAvailable(document, target, language);
  });
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-cards">
        {products.map(product => {
          const target = productPage(document, product);
          if (!target || !pageLocaleAvailable(document, target, language)) return null;
          const image = mediaFromSrc(document, product.image, language, product.imageAlt);
          const sizes = imageSizes(document.theme.containerWidth, 'card', products.length, section.variant === 'featured', image?.src);
          const price = formatPrice(product, language);
          return (
            <button key={product.id} type="button" className="cms-card cms-product-card" data-page-id={target.id} data-product-id={product.id} onClick={() => onNavigate(target.id)}>
              {image ? <img className={image.portrait ? 'cms-img cms-img-portrait' : 'cms-img'} {...responsiveImageProps(image.src, sizes)} alt={image.alt} width={image.width} height={image.height} style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
              <span className="cms-card-body">
                {localizedText(product.subtitle, language) ? <span className="cms-eyebrow">{localizedText(product.subtitle, language)}</span> : null}
                <span className="cms-card-title">{localizedText(product.title, language)}</span>
                <span className="cms-card-copy">{localizedText(product.shortDescription, language)}</span>
                {price ? <span className="cms-price" data-price-product-id={product.id}>{price}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Gallery({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'gallery') return null;
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-frames">
        {section.images.map((image, index) => {
          const media = resolveImage(document, image, language);
          if (!media) return null;
          return (
            <figure key={`${image.mediaId}-${index}`} className={media.portrait ? 'cms-frame cms-frame-portrait' : 'cms-frame'}>
              <img {...responsiveImageProps(media.src, imageSizes(document.theme.containerWidth), true)} alt={media.alt} width={media.width} height={media.height} style={media.objectPosition ? { objectPosition: media.objectPosition } : undefined} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              {media.caption ? <figcaption>{media.caption}</figcaption> : null}
            </figure>
          );
        })}
      </div>
    </>
  );
}

function Benefits({ section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'benefits') return null;
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <ul className="cms-benefit-list">
        {section.items.map((item, index) => {
          const title = localizedText(item.title, language);
          const description = localizedText(item.description, language);
          if (!title && !description) return null;
          return <li key={index}>{title ? <strong>{title}</strong> : null}{description ? <span>{description}</span> : null}</li>;
        })}
      </ul>
    </>
  );
}

function Cta(props: SectionRendererProps) {
  const { document, page, section, language, titleTag, onNavigate, onBook } = props;
  if (section.type !== 'cta') return null;
  const productId = visibleBookingProduct(document, page, section);
  const product = productId ? publicProduct(document, productId) : undefined;
  const price = product ? formatPrice(product, language) : '';
  return (
    <div className="cms-cta-layout">
      {section.variant === 'split' ? <CmsImg document={document} image={section.image} language={language} className="cms-cover" /> : null}
      <div className="cms-cta-copy">
        <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
        {price ? <p className="cms-price" data-price-product-id={product?.id}><strong>{price}</strong></p> : null}
        <Actions document={document} links={section.links} language={language} onNavigate={onNavigate} />
        {productId ? (
          <button type="button" className="cms-button cms-button-book" data-action="book" data-product-id={productId} onClick={() => onBook(productId)}>
            {uiText(document, 'ui.common.bookNow', language, { en: 'Book this tour', fr: 'Réserver cette visite', es: 'Reservar esta visita' })}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Reviews({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'reviews') return null;
  const reviews = section.reviewIds.map(id => document.reviews.find(review => review.id === id && review.enabled)).filter(review => review !== undefined);
  const readLabel = uiText(document, 'TripadvisorReviewsSection.label.3', language, { en: 'Read on Tripadvisor', fr: 'Lire sur Tripadvisor', es: 'Leer en Tripadvisor' });
  const cards = (hidden: boolean) => reviews.map(review => {
    const body = (
      <>
        <span className="cms-review-head"><span className="cms-review-avatar" aria-hidden="true">{review.author.charAt(0).toUpperCase()}</span><span><strong>{review.author}</strong><small>Tripadvisor · {review.date}</small></span></span>
        <strong className="cms-review-title">{review.title}</strong>
        <p>{review.quote}</p>
        <span className="cms-review-read">{readLabel}</span>
      </>
    );
    const safe = isSafeCmsUrl(review.url);
    return safe
      ? <a key={review.id} className="cms-review-card" href={review.url} target="_blank" rel="noopener noreferrer" dir="ltr" tabIndex={hidden ? -1 : 0} aria-hidden={hidden || undefined}>{body}</a>
      : <article key={review.id} className="cms-review-card" dir="ltr" aria-hidden={hidden || undefined}>{body}</article>;
  });
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      {section.variant === 'grid'
        ? <div className="cms-review-grid">{cards(false)}</div>
        : (
          <div className="cms-marquee" tabIndex={0} aria-label={uiText(document, 'TripadvisorReviewsSection.text.1', language, { en: 'Tripadvisor traveler reviews', fr: 'Avis Tripadvisor', es: 'Opiniones de viajeros en Tripadvisor' })}>
            <div className="cms-marquee-track"><div className="cms-marquee-set">{cards(false)}</div><div className="cms-marquee-set" aria-hidden="true">{cards(true)}</div></div>
          </div>
        )}
    </>
  );
}

function Faq({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'faq') return null;
  const items = section.faqIds.map(id => document.faqs.find(item => item.id === id)).filter(item => item !== undefined);
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      {section.variant === 'list'
        ? <dl className="cms-faq-list">{items.map(item => <div key={item.id}><dt>{localizedText(item.question, language)}</dt><dd>{localizedText(item.answer, language)}</dd></div>)}</dl>
        : items.map(item => <details key={item.id} className="cms-faq-item"><summary>{localizedText(item.question, language)}</summary><p>{localizedText(item.answer, language)}</p></details>)}
    </>
  );
}

function Team({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'team') return null;
  const members = section.teamIds.map(id => document.teamMembers.find(member => member.id === id)).filter(member => member !== undefined);
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-members">
        {members.map(member => {
          const image = mediaFromSrc(document, member.avatarUrl, language, { en: member.name, fr: member.name, es: member.name });
          return (
            <article key={member.id} className="cms-member">
              {image ? <img className="cms-avatar" {...responsiveImageProps(image.src, imageSizes(document.theme.containerWidth))} alt={image.alt} width={image.width} height={image.height} style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
              <div>
                <h3>{member.name}</h3>
                <p className="cms-eyebrow">{localizedText(member.role, language)}</p>
                {section.variant === 'story' ? <p>{localizedText(member.bio, language)}</p> : null}
                <p>{localizedText(member.experience, language)}{member.languages.length ? ` · ${member.languages.join(', ')}` : ''}</p>
                {member.licenseNumber ? <p className="cms-meta">{member.licenseNumber}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function Itinerary({ section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'itinerary') return null;
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <ol className="cms-stops">
        {section.stops.map((stop, index) => (
          <li key={index}>
            {stop.time ? <time>{stop.time}</time> : null}
            {localizedText(stop.badge, language) ? <span className="cms-badge">{localizedText(stop.badge, language)}</span> : null}
            <strong>{localizedText(stop.title, language)}</strong>
            {localizedText(stop.description, language) ? <p>{localizedText(stop.description, language)}</p> : null}
          </li>
        ))}
      </ol>
    </>
  );
}

function Inclusions({ document, section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'inclusions') return null;
  const included = localizedList(section.included, language).filter(Boolean);
  const excluded = localizedList(section.excluded, language).filter(Boolean);
  const includedLabel = uiText(document, 'ui.renderer.included', language, { en: 'Included', fr: 'Inclus', es: 'Incluido' });
  const excludedLabel = uiText(document, 'ui.renderer.excluded', language, { en: 'Not included', fr: 'Non inclus', es: 'No incluido' });
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-inclusion-cols">
        <div><h3>{includedLabel}</h3><ul>{included.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        <div><h3>{excludedLabel}</h3><ul className="cms-excluded">{excluded.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
      </div>
    </>
  );
}

function PracticalInfo({ section, language, titleTag }: SectionRendererProps) {
  if (section.type !== 'practicalInfo') return null;
  return (
    <>
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <div className="cms-fact-list">
        {section.items.map((item, index) => {
          const title = localizedText(item.title, language);
          const description = localizedText(item.description, language);
          if (!title && !description) return null;
          return <article key={index}>{title ? <h3>{title}</h3> : null}{description ? <p>{description}</p> : null}</article>;
        })}
      </div>
    </>
  );
}

function Contact(props: SectionRendererProps) {
  const { section, language, titleTag } = props;
  if (section.type !== 'contact') return null;
  return (
    <div className="cms-contact-layout">
      <Heading section={section} language={language} titleTag={titleTag} id={domId(section.id) ? `${section.id}-title` : undefined} />
      <Actions document={props.document} links={section.links} language={language} onNavigate={props.onNavigate} />
    </div>
  );
}

function renderBody(props: SectionRendererProps): ReactNode {
  switch (props.section.type) {
    case 'hero': return <Hero {...props} />;
    case 'richText': return <RichText {...props} />;
    case 'cardGrid': return <CardGrid {...props} />;
    case 'productGrid': return <ProductGrid {...props} />;
    case 'gallery': return <Gallery {...props} />;
    case 'benefits': return <Benefits {...props} />;
    case 'cta': return <Cta {...props} />;
    case 'reviews': return <Reviews {...props} />;
    case 'faq': return <Faq {...props} />;
    case 'team': return <Team {...props} />;
    case 'itinerary': return <Itinerary {...props} />;
    case 'inclusions': return <Inclusions {...props} />;
    case 'practicalInfo': return <PracticalInfo {...props} />;
    case 'contact': return <Contact {...props} />;
    default: return null;
  }
}

export function SectionRenderer(props: SectionRendererProps) {
  const { section, language } = props;
  const id = domId(section.id);
  const titled = Boolean(localizedText(section.title, language));
  const bleed = section.type === 'hero' && section.variant === 'banner';
  const body = renderBody(props);
  return (
    <section
      id={id}
      data-section-id={section.id}
      data-section-type={knownType(section.type) ? section.type : undefined}
      data-variant={knownVariant(section)}
      className={sectionClass(section)}
      aria-labelledby={id && titled ? `${id}-title` : undefined}
    >
      {bleed ? body : <div className="cms-wrap">{body}</div>}
    </section>
  );
}
