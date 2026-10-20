import React, { Children, cloneElement, createContext, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import type { CmsDocument, CmsPage, CmsSection } from './schema';
import type { Language } from '../types';

const ApprovedContent = createContext<{document: CmsDocument | null; page?: CmsPage; language?: Language; annotate?: boolean}>({document:null});
export function ApprovedContentProvider({document, page, language, children, annotate=true}: {document:CmsDocument;page:CmsPage;language:Language;children:ReactNode;annotate?:boolean}) {
  return <ApprovedContent.Provider value={{document,page,language,annotate}}>{children}</ApprovedContent.Provider>;
}
/** Explicit section bindings preserve the approved markup; no DOM/text replacement. */
export function useApprovedContent(pageId?: string) {
  const context=useContext(ApprovedContent);
  const page=pageId && context.document ? context.document.pages.find(page=>page.id===pageId) : context.page;
  return {document:context.document,page,section<T extends CmsSection['type']>(id:string,type:T) {
    return page?.sections.find(section=>section.id===id && section.type===type) as Extract<CmsSection,{type:T}>|undefined;
  }};
}
export function ApprovedSection({id,children}: {id:string;children:ReactElement}) {
  const {document,page,language,annotate}=useContext(ApprovedContent);
  if (!document) return children;
  const section=page?.sections.find(section=>section.id===id);
  if (!section?.enabled) return null;
  if (section.type==='cta' && section.variant==='booking' && (page?.kind!=='product' || section.productId!==page.productId || !document.products.some(product=>product.id===section.productId && product.published!==false))) return null;
  return cloneElement(children as ReactElement<Record<string,unknown>>, {...(annotate===false ? {} : {'data-section-id':id,'data-section-type':section.type,'data-variant':section.variant}),lang:language,dir:'ltr'});
}
/** Order within an authored slot; never flatten a two-column tour into a list. */
export function ApprovedSections({children}: {children:ReactNode}) {
  const {page}=useApprovedContent();
  if (!page) return <>{children}</>;
  const order=new Map(page.sections.map((section,index)=>[section.id,index]));
  const items=Children.toArray(children);
  const position=(node:ReactNode)=>isValidElement<{id?:string}>(node) && node.type===ApprovedSection ? order.get(node.props.id ?? '') : undefined;
  const sorted=items.filter(node=>position(node)!==undefined).sort((a,b)=>position(a)!-position(b)!);
  // Static layout containers keep their authored slot; sorting them to the end changes the design.
  let index=0;
  return <>{items.map(node=>position(node)===undefined ? node : sorted[index++])}</>;
}
/** The default CMS theme is a migration sentinel, not permission to restyle the hosted design. */
export function approvedThemeActive(theme:CmsDocument['theme']):boolean {
  return theme.colors.primary.toUpperCase()!=='#005F5A' || theme.colors.accent.toUpperCase()!=='#C84B31' || theme.colors.background.toUpperCase()!=='#FAF8F5' || theme.colors.text.toUpperCase()!=='#1C2524' || theme.font!=='system' || theme.fontScale!==1 || theme.containerWidth!==1280 || theme.spacing!=='comfortable' || theme.radius!=='rounded' || theme.buttonVariant!=='solid' || theme.cardVariant!=='outlined';
}
