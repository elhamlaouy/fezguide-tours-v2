import React from 'react';
import type { PageRendererProps } from './PageRenderer';
import { approvedEditorial, approvedPublicData } from './approved-data';
// App already bundles HomePage for the no-CMS fallback; do not suspend that same first viewport.
import { HomePage } from '../pages/HomePage';
// SSR callers explicitly preload after module initialization; browsers load only the selected route.
const loaders: (() => Promise<unknown>)[] = [];
function approvedComponent<P extends object>(loader: () => Promise<{ default: React.ComponentType<P> }>): React.ComponentType<P> {
  let ready: React.ComponentType<P> | undefined;
  const load = () => loader().then(module => { ready = module.default; return module; });
  loaders.push(load);
  const Lazy = React.lazy(load);
  return function ApprovedComponent(props: P) { const Component = ready ?? Lazy; return <Component {...props} />; };
}
export async function preloadApprovedLayouts() { await Promise.all(loaders.map(load => load())); }
const FezPage = approvedComponent(async () => ({ default: (await import('../pages/FezPage')).FezPage }));
const DayTripsPage = approvedComponent(async () => ({ default: (await import('../pages/DayTripsPage')).DayTripsPage }));
const FoodToursPage = approvedComponent(async () => ({ default: (await import('../pages/FoodToursPage')).FoodToursPage }));
const TravelTipsPage = approvedComponent(async () => ({ default: (await import('../pages/TravelTipsPage')).TravelTipsPage }));
const AboutPage = approvedComponent(async () => ({ default: (await import('../pages/AboutPage')).AboutPage }));
const BlogPage = approvedComponent(async () => ({ default: (await import('../pages/BlogPage')).BlogPage }));
const CustomPageRenderer = approvedComponent(async () => ({ default: (await import('../pages/CustomPageRenderer')).CustomPageRenderer }));
const MedinaArticlePage = approvedComponent(async () => ({ default: (await import('../pages/MedinaArticlePage')).MedinaArticlePage }));
const HistoryCultureArticlePage = approvedComponent(async () => ({ default: (await import('../pages/HistoryCultureArticlePage')).HistoryCultureArticlePage }));
const ThingsToDoArticlePage = approvedComponent(async () => ({ default: (await import('../pages/ThingsToDoArticlePage')).ThingsToDoArticlePage }));
const OurFezToursPage = approvedComponent(async () => ({ default: (await import('../pages/OurFezToursPage')).OurFezToursPage }));
const ExperienceDetailPage = approvedComponent(async () => ({ default: (await import('../pages/ExperienceDetailPage')).ExperienceDetailPage }));
const EditorialArticlePage = approvedComponent(async () => ({ default: (await import('../components/EditorialArticlePage')).EditorialArticlePage }));

const SECTION_IDS: Record<string, string[]> = {
  home:['hero','trust','quick-navigation','featured','why-choose-us','reviews','contact'],
  fez:['hero','introduction','overview','fez-tours-cta','gallery'],
  'day-trips':['hero','promises','overview','gallery','custom-itinerary'],
  'food-tours':['hero','introduction','tastings','overview','gallery','food-tour-cta'],
  'travel-tips':['hero','introduction','quick-rules','overview','gallery','currency-estimator','medina-gates','contact'],
  about:['introduction','med','med-photo','guides','guides-photos','drivers','drivers-photos','why'],
  blog:['hero','posts'],
  'our-fez-tours':['header','gallery','facts','overview','included','meeting','itinerary','extra','cancel','booking','reviews'],
};
export function approvedSectionIds(page:PageRendererProps['page']):string[] {
  return SECTION_IDS[page.id] ?? page.sections.filter(section=>/^(?:story-|photos-|gallery-)/.test(section.id) || ['header','gallery','facts','overview','highlights','itinerary','included','bring','booking','related','reviews','introduction','fez-tours-cta','product-cta','contact','hero','content','cover'].includes(section.id)).map(section=>section.id);
}

/** Existing approved compositions consume the CMS; only genuinely new pages use generic sections. */
export function approvedPage(props:PageRendererProps):React.ReactNode | undefined {
  const {document,page,language,onNavigate,onBook}=props;
  if (SECTION_IDS[page.id] && !page.sections.some(section=>SECTION_IDS[page.id].includes(section.id))) return undefined;
  const data=approvedPublicData(document);
  const explore=(item:{id:string})=>onNavigate(item.id);
  const book=(title?:string)=>{
    const product=document.products.find(product=>product.title[language]===title) ?? document.products.find(product=>product.id===page.productId);
    onBook(product?.id ?? '');
  };
  switch(page.id) {
    case 'home':return <HomePage language={language} onNavigate={onNavigate} onExplore={explore} onBookTour={book}/>;
    case 'fez':return <FezPage language={language} onExplore={explore} onBookTour={book}/>;
    case 'day-trips':return <DayTripsPage language={language} onExplore={explore} onBookTour={book}/>;
    case 'food-tours':return <FoodToursPage language={language} onExplore={explore} onBookTour={book}/>;
    case 'travel-tips':return <TravelTipsPage language={language} onExplore={explore} onBookTour={book}/>;
    case 'about':return <AboutPage language={language} onNavigate={onNavigate}/>;
    case 'blog':return <BlogPage language={language} onBookTour={book}/>;
    case 'our-fez-tours':return <OurFezToursPage language={language} onBack={()=>onNavigate(page.parentId ?? 'fez')} onNavigate={onNavigate} onBookTour={()=>onBook(page.productId ?? page.id)}/>;
    case 'fez-explore-medina':return <MedinaArticlePage language={language} onBack={()=>onNavigate(page.parentId ?? 'fez')} onNavigate={onNavigate} onExploreTours={()=>onNavigate('our-fez-tours')}/>;
    case 'fez-history-landmarks':return <HistoryCultureArticlePage language={language} onBack={()=>onNavigate(page.parentId ?? 'fez')} onNavigate={onNavigate} onExploreTours={()=>onNavigate('our-fez-tours')}/>;
    case 'fez-things-to-do':return <ThingsToDoArticlePage language={language} onBack={()=>onNavigate(page.parentId ?? 'fez')} onNavigate={onNavigate} onExploreTours={()=>onNavigate('our-fez-tours')}/>;
  }
  if (page.kind==='product' && ['daytrip-chefchaouen','daytrip-meknes','daytrip-ifrane','daytrip-custom','our-food-tours'].includes(page.id)) {
    const product=document.products.find(product=>product.id===page.productId);
    if (product) return <ExperienceDetailPage pillar={product} language={language} onNavigate={onNavigate} onSelectExperience={explore} onBookTour={()=>onBook(product.id)}/>;
  }
  if (['food-tasting-walk','food-culture-life','food-markets-souks','food-traditional-fassi','tips-getting-around','tips-plan-trip','tips-practical'].includes(page.id)) {
    const article=approvedEditorial(document,page);
    return <EditorialArticlePage article={article} language={language} onBack={()=>onNavigate(page.parentId ?? 'home')} onNavigate={onNavigate} onOpenProduct={()=>{if(article.productId)onNavigate(article.productId);}}/>;
  }
  const post=document.blogPosts.find(post=>post.id===page.id);
  if (post) return <BlogPage language={language} initialPostId={post.id} onBookTour={book}/>;
  const custom=data.customPages.find(custom=>custom.id===page.id || custom.slug===page.slug);
  if (custom) return <CustomPageRenderer page={custom} language={language} onNavigate={onNavigate} onBookTour={book}/>;
  return undefined;
}
