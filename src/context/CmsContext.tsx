import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { approvedPublicData } from '../cms/approved-data';
import { BlogPost, CustomPage, FaqItem, SectionPillar, SiteSettings, TeamMember } from '../types';
import type { CmsDocument } from '../cms/schema';
import { fetchPublishedDocument, readPublishedSnapshot } from '../cms/public-document';
import { DEFAULT_SITE_SETTINGS, DEFAULT_BLOG_POSTS, DEFAULT_CUSTOM_PAGES } from '../data/shared-ui';

export interface PublicCmsData {
  tours: SectionPillar[];
  customPages: CustomPage[];
  blogPosts: BlogPost[];
  teamMembers: TeamMember[];
  faqs: FaqItem[];
  siteSettings: SiteSettings;
}

interface CmsContextValue extends PublicCmsData {
  publishedDocument: CmsDocument | null;
}

const emptyData: PublicCmsData = { tours: [], customPages: DEFAULT_CUSTOM_PAGES, blogPosts: DEFAULT_BLOG_POSTS, teamMembers: [], faqs: [], siteSettings: DEFAULT_SITE_SETTINGS };

const CmsContext = createContext<CmsContextValue | undefined>(undefined);

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PublicCmsData>(emptyData);
  const [publishedDocument, setPublishedDocument] = useState<CmsDocument | null>(readPublishedSnapshot);

  useEffect(() => {
    const controller = new AbortController();
    // ponytail: a published snapshot is authoritative; do not paint/fetch the legacy site first.
    if (publishedDocument) return () => controller.abort();

    const loadPublicContent = async () => {
      // ponytail: the source catalog is needed only when no valid published document exists.
      try {
        const { defaultData, mergeLegacyPublicData } = await import('./legacy-public-data');
        if (controller.signal.aborted) return;
        setData(defaultData);
        const response = await fetch('/api/cms', { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json();
        if (!controller.signal.aborted) setData(current => mergeLegacyPublicData(current, payload));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    };

    // ponytail: source protections stay in the lazy fallback; PageRenderer uses this document as validated.
    void fetchPublishedDocument({ signal: controller.signal }).then((document) => {
      if (controller.signal.aborted) return;
      if (document) setPublishedDocument(document);
      else void loadPublicContent();
    });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ ...(publishedDocument ? approvedPublicData(publishedDocument) : data), publishedDocument }), [data, publishedDocument]);
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
};

/** Local editor projection only: no fetching and no mutation of the published context. */
export const CmsPreviewProvider: React.FC<{ document: CmsDocument; children: React.ReactNode }> = ({ document, children }) => {
  const value = useMemo(() => ({ ...approvedPublicData(document), publishedDocument: document }), [document]);
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
};

export const useCms = (): CmsContextValue => {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
};
