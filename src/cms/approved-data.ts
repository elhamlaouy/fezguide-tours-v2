import type { CmsDocument, CmsPage, Localized, PublicCmsData } from './schema';
import type { SectionPillar } from '../types';
import { isPublicPage, resolveImage } from './render-utils';

const blank=():Localized=>({en:'',fr:'',es:''});
const blankList=():Localized<string[]>=>({en:[],fr:[],es:[]});
/** Canonical data remains complete when the HTML bootstrap trims compatibility duplicates. */
export function approvedPublicData(document:CmsDocument):PublicCmsData {
  const cards=document.pages.flatMap(page=>page.sections.flatMap(section=>section.type==='cardGrid'?section.cards:[]));
  const legacy=new Map(document.legacy.tours.map(tour=>[tour.id,tour]));
  const products=new Map(document.products.map(product=>[product.id,product]));
  const eligible=document.pages.filter(page=>isPublicPage(document,page));
  const toursById=new Map<string,SectionPillar>();
  for (const page of eligible) {
    const product=products.get(page.productId ?? '');
    if (product) { toursById.set(product.id,product); continue; }
    if (!page.parentId || page.kind!=='editorial' || document.blogPosts.some(post=>post.id===page.id)) continue;
    const original=legacy.get(page.id);
    const card=cards.find(card=>card.pageId===page.id);
    const image=card?.image ? resolveImage(document,card.image,'en') : undefined;
    const paragraphs=page.sections.flatMap(section=>section.enabled && section.type==='richText'?section.blocks.filter(block=>block.type==='paragraph').map(block=>'text' in block?block.text:blank()):[]);
    const description=Object.fromEntries(['en','fr','es'].map(lang=>[lang,paragraphs.map(p=>p[lang as keyof Localized]).join('\n\n')])) as Localized;
    toursById.set(page.id,{
      ...original,id:page.id,pageId:page.parentId,title:page.title,subtitle:card?.badge ?? original?.subtitle ?? blank(),
      shortDescription:card?.description ?? original?.shortDescription ?? paragraphs[0] ?? blank(),fullDescription:description,
      highlights:original?.highlights ?? blankList(), image:image?.src ?? original?.image ?? '',
      imageAlt:card?.image?.alt ?? original?.imageAlt ?? blank(),actionType:'explore',kind:'article',published:true,
    });
  }
  const featured=document.pages.find(page=>page.id==='home')?.sections.find(section=>section.id==='featured');
  const ids=featured?.type==='cardGrid' ? featured.cards.map(card=>card.pageId ?? card.id) : [];
  const order=[...document.legacy.tours.map(tour=>tour.id),...ids,...toursById.keys()];
  const tours=[...new Set(order)].flatMap(id=>toursById.has(id)?[toursById.get(id)!]:[]);
  const customPages=eligible.filter(page=>page.kind==='landing' && (page.source==='src/data/translations.ts' || document.legacy.customPages.some(custom=>custom.id===page.id))).map(page=>{
    const source=document.legacy.customPages.find(custom=>custom.id===page.id);
    const hero=page.sections.find(section=>section.type==='hero');
    const content=page.sections.find(section=>section.id==='content' && section.type==='richText');
    const highlights=page.sections.find(section=>section.id==='highlights' && section.type==='richText');
    const block=highlights?.type==='richText'?highlights.blocks.find(block=>block.type==='list'):undefined;
    return {id:page.id,slug:page.slug,title:page.title,subtitle:hero?.description ?? blank(),heroImage:hero?.type==='hero' && hero.image?resolveImage(document,hero.image,'en')?.src ?? '':'',
      content:Object.fromEntries(['en','fr','es'].map(lang=>[lang,content?.type==='richText'?content.blocks.flatMap(block=>'text' in block?[block.text[lang as keyof Localized]]:[]).join('\n\n'):''])) as Localized,
      highlights:block?.type==='list'?block.items:blankList(),showInNav:document.navigation.some(link=>link.enabled && link.pageId===page.id),published:true,createdAt:source?.createdAt ?? ''};
  });
  return {tours,customPages,blogPosts:document.blogPosts.filter(post=>post.published && eligible.some(page=>page.id===post.id)),teamMembers:document.teamMembers,faqs:document.faqs,siteSettings:document.siteSettings};
}

export function approvedEditorial(document:CmsDocument,page:CmsPage) {
  const suffixes=[...new Set(page.sections.flatMap(section=>section.enabled && (section.type==='richText' || section.type==='gallery' && section.id.startsWith('photos-')) ? [section.id.replace(/^(?:story|photos)-/, '')] : []))];
  const sections=suffixes.map(suffix=>{
    const section=page.sections.find(item=>item.id===`story-${suffix}` && item.type==='richText');
    const photos=page.sections.find(item=>item.id===`photos-${suffix}` && item.type==='gallery');
    return {storyId:section?.id,photosId:photos?.id,heading:section?.enabled?section.title:undefined,paragraphs:Object.fromEntries(['en','fr','es'].map(lang=>[lang,section?.type==='richText' && section.enabled ? section.blocks.flatMap(block=>'text' in block && block.type==='paragraph'?[block.text[lang as keyof Localized]]:[]):[]])) as Localized<string[]>,images:photos?.type==='gallery' && photos.enabled ? photos.images.flatMap(image=>{
      const media=resolveImage(document,image,'en');
      return media?[{src:media.src,width:media.width ?? 1200,height:media.height ?? 900,alt:image.alt}]:[];
    }):[]};
  });
  const cta=page.sections.find(section=>section.id==='product-cta' && section.type==='cta');
  const picture=cta?.type==='cta' && cta.image ? resolveImage(document,cta.image,'en'):undefined;
  const contact=page.sections.find(section=>section.id==='contact' && section.type==='contact');
  const link=contact?.type==='contact' && contact.enabled ? contact.links.find(link=>link.enabled && link.href):undefined;
  return {id:page.id,template:'editorial-guide' as const,title:page.title,sections,
    productId:cta?.type==='cta'?cta.productId:undefined,
    ...(cta?.type==='cta' && cta.enabled ? {cta:{intro:cta.description ?? blank(),lead:cta.title ?? blank(),button:cta.links.find(link=>link.enabled)?.label ?? blank(),image:picture?.src ?? '',imageAlt:cta.image?.alt ?? blank()}}:{}),
    ...(link?.href?{contact:{href:link.href,label:link.label}}:{}),
    parentLabel:page.parentId==='travel-tips'?{en:'Travel Tips',fr:'Conseils de voyage',es:'Consejos de viaje'}:undefined};
}
