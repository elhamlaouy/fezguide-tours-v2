import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return nextLoad(url, context);
} });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const components = Object.fromEntries(await Promise.all([
  ['home', 'HomePage'], ['fez', 'FezPage'], ['day-trips', 'DayTripsPage'], ['food-tours', 'FoodToursPage'],
  ['travel-tips', 'TravelTipsPage'], ['about', 'AboutPage'], ['blog', 'BlogPage'], ['page-bespoke-itinerary', 'CustomPageRenderer'],
].map(async ([id, name]) => [id, (await import(`../src/pages/${name}.tsx`))[name]])));
const text = value => ({ en: value, fr: value, es: value });
const render = (document, id, language = 'en', props = {}) => {
  const page = document.pages.find(page => page.id === id);
  return renderToStaticMarkup(createElement(CmsPreviewProvider, { document },
    createElement(ApprovedContentProvider, { document, page }, createElement(components[id], {
      language, onNavigate() {}, onExplore() {}, onBookTour() {}, ...props,
    }))));
};
const section = (document, pageId, id) => document.pages.find(page => page.id === pageId).sections.find(section => section.id === id);

test('home keeps the hosted cinematic geometry while accepting authoritative hero edits', () => {
  const document = createCmsSeed();
  const hero = section(document, 'home', 'hero');
  hero.title = text('Owner hero edit');
  hero.description = text('Owner hero description');
  hero.eyebrow = text('Owner hero kicker');
  hero.image = { mediaId: document.media[0].id, alt: text('Owner image alternative') };
  const html = render(document, 'home');
  assert.match(html, /min-h-\[580px\] lg:min-h-\[660px\]/);
  for (const value of ['Owner hero edit', 'Owner hero description', 'Owner hero kicker', 'Owner image alternative']) assert.ok(html.includes(value), value);
});

for (const pageId of ['fez', 'day-trips', 'food-tours', 'travel-tips']) {
  test(`${pageId} projects owner hero, overview cards, gallery, and benefit edits into the hosted layout`, () => {
    const document = createCmsSeed();
    const hero = section(document, pageId, 'hero');
    const overview = section(document, pageId, 'overview');
    const gallery = section(document, pageId, 'gallery');
    hero.title = text('Owner landing title');
    hero.description = text('Owner landing description');
    hero.eyebrow = text('Owner landing kicker');
    overview.cards = [{ ...overview.cards[0], title: text('Owner card title'), description: text('Owner card description'), badge: text('Owner badge') }];
    gallery.title = text('Owner gallery heading');
    gallery.images = [{ mediaId: document.media[0].id, alt: text('Owner gallery alt'), caption: text('Owner gallery caption') }];
    const benefits = section(document, pageId, ({fez: 'introduction', 'day-trips': 'promises', 'food-tours': 'tastings', 'travel-tips': 'quick-rules'})[pageId]);
    benefits.items = [{ title: text('Owner benefit title'), description: text('Owner benefit copy') }];
    const html = render(document, pageId);
    for (const value of ['Owner landing title', 'Owner landing description', 'Owner landing kicker', 'Owner card title', 'Owner card description', 'Owner gallery heading', 'Owner gallery alt', 'Owner gallery caption', 'Owner benefit title', 'Owner benefit copy']) assert.ok(html.includes(value), `${pageId}: ${value}`);
    assert.ok(html.includes('bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12'), 'hosted glass header retained');
    assert.equal(html.includes('cms-hero-banner'), false);
  });
}


test('about keeps its editorial/photo geometry and reads every story/photo section from the document', () => {
  const document = createCmsSeed();
  const about = document.pages.find(page => page.id === 'about');
  about.title = text('Owner about title');
  for (const item of about.sections) {
    item.title = text(`Owner ${item.id} heading`);
    if (item.type === 'richText') item.blocks = [{ type: 'paragraph', text: text(`Owner ${item.id} story`) }];
    if (item.type === 'gallery') item.images = [{ mediaId: document.media[0].id, alt: text(`Owner ${item.id} photo`) }];
  }
  const html = render(document, 'about');
  for (const item of about.sections) assert.ok(html.includes(`Owner ${item.id} ${item.type === 'gallery' ? 'photo' : 'story'}`), item.id);
  assert.ok(html.includes('Owner about title'));
  assert.ok(html.includes('editorial-story-page max-w-5xl mx-auto'));
  assert.ok(html.includes('grid grid-cols-1 sm:grid-cols-2 gap-4'));
});

test('blog listing reads owner card overrides, not the legacy entity mirror', () => {
  const document = createCmsSeed();
  const posts = section(document, 'blog', 'posts');
  section(document, 'blog', 'hero').title = text('Owner journal header');
  posts.cards = [{ ...posts.cards[0], title: text('Owner post card'), description: text('Owner post teaser') }];
  const html = render(document, 'blog');
  for (const value of ['Owner journal header', 'Owner post card', 'Owner post teaser']) assert.ok(html.includes(value), value);
  assert.ok(html.includes('aspect-16/10'));
  posts.cards = [];
  assert.equal(render(document, 'blog').includes('Owner post card'), false);
});

test('direct blog post opens the original reader with authoritative title, content, photo and canonical metadata', () => {
  const document = createCmsSeed();
  const post = document.blogPosts[0];
  const page = document.pages.find(page => page.id === post.id);
  page.title = text('Owner direct story title');
  section(document, post.id, 'content').blocks = [{ type: 'paragraph', text: text('Owner direct story body') }];
  section(document, post.id, 'cover').images = [{ mediaId: document.media[0].id, alt: text('Owner direct photo') }];
  post.author = 'Owner canonical author';
  const html = render(document, 'blog', 'en', { initialPostId: post.id });
  for (const value of ['Owner direct story title', 'Owner direct story body', 'Owner direct photo', 'Owner canonical author', 'role="dialog"']) assert.ok(html.includes(value), value);
});

test('custom landing uses authoritative hero, story and highlights, including deliberate blank locales', () => {
  const document = createCmsSeed();
  const custom = document.legacy.customPages[0];
  const page = document.pages.find(page => page.id === custom.id);
  section(document, page.id, 'hero').title = text('Owner custom hero');
  section(document, page.id, 'hero').description = text('Owner custom subtitle');
  section(document, page.id, 'content').blocks = [{ type: 'paragraph', text: text('Owner custom story') }];
  section(document, page.id, 'highlights').blocks = [{ type: 'list', items: text(['Owner custom highlight']) }];
  const html = render(document, page.id, 'en', { page: custom });
  for (const value of ['Owner custom hero', 'Owner custom subtitle', 'Owner custom story', 'Owner custom highlight']) assert.ok(html.includes(value), value);
  section(document, page.id, 'hero').title.fr = '';
  section(document, page.id, 'content').blocks = [];
  section(document, page.id, 'highlights').blocks = [];
  const blank = render(document, page.id, 'fr', { page: custom });
  assert.equal(blank.includes('Owner custom hero'), false);
  assert.equal(blank.includes('Owner custom story'), false);
  assert.equal(blank.includes('Owner custom highlight'), false);
});

test('travel practical panels and contact are editable and independently hideable', () => {
  const document = createCmsSeed();
  const currency = section(document, 'travel-tips', 'currency-estimator');
  const gates = section(document, 'travel-tips', 'medina-gates');
  const contact = section(document, 'travel-tips', 'contact');
  currency.title = text('Owner currency title');
  currency.items[0].title = text('Owner amount label');
  currency.items[0].description = text('Owner rate explanation');
  gates.title = text('Owner gate heading');
  gates.items = [{ title: text('Owner gate'), description: text('Owner gate directions') }];
  contact.title = text('Owner contact title');
  contact.links = [{ id: 'owner-contact', enabled: true, href: 'https://example.com/contact', label: text('Owner contact action') }];
  const html = render(document, 'travel-tips');
  for (const value of ['Owner currency title', 'Owner amount label', 'Owner rate explanation', 'Owner gate heading', 'Owner gate directions', 'Owner contact title', 'Owner contact action', 'https://example.com/contact']) assert.ok(html.includes(value), value);
  for (const item of [currency, gates, contact]) item.enabled = false;
  const hidden = render(document, 'travel-tips');
  for (const value of ['Owner currency title', 'Owner gate heading', 'Owner contact title']) assert.equal(hidden.includes(value), false, value);
});
