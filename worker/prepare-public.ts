import type { CmsDocument } from '../src/cms/schema';
import { isPublicPage, pageLocaleAvailable } from '../src/cms/render-utils';
import { pagePath, resolveRoute } from '../src/cms/routing';
import { publicCmsDocument } from './cms-routes';
import { rewriteRouteHtml } from './seo';

type PrepareInput = { revision: number; origin: string; shell: string; document: object };
const locales = ['en', 'fr', 'es'] as const;

/** Runs off the visitor request. The stored pages are what the app Worker serves. */
export function preparePublicRelease(input: PrepareInput) {
  const document = publicCmsDocument(input.document) as unknown as CmsDocument;
  const objects: Record<string, string> = {};
  const routes: Record<string, { key: string; status: number }> = {};
  for (const page of document.pages) {
    if (!isPublicPage(document, page)) continue;
    for (const language of locales) {
      if (!pageLocaleAvailable(document, page, language)) continue;
      const path = pagePath(document, page.id, language);
      const route = resolveRoute(new URL(path, input.origin), document);
      const key = `prepared/${input.revision}/${language}/${page.id}`;
      objects[key] = rewriteRouteHtml(input.shell, document, route, input.origin);
      routes[path] = { key, status: route.page ? 200 : 404 };
    }
  }
  return { catalog: { revision: input.revision, origin: input.origin, policy: 'cms-public-v1', routes }, objects };
}
