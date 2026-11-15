import React from 'react';
import type { Language } from '../types';
import { useOptionalCms } from '../context/CmsContext';
import { useApprovedContent } from '../cms/approved-content';
import { pagePath } from '../cms/routing';

/** True for a plain primary-button click; modified clicks keep the browser's native link behaviour. */
export function isPlainLeftClick(event: Pick<React.MouseEvent, 'defaultPrevented' | 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  return !(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/** Resolves the same URL App.navigate() pushes to history for a page id/slug and language. */
export function usePagePath(): (key: string, language: Language) => string {
  const published = useOptionalCms()?.publishedDocument;
  const { document: approved } = useApprovedContent();
  const document = published ?? approved ?? null;
  return React.useCallback((key: string, language: Language) => pagePath(document, key, language), [document]);
}

export interface InternalLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  href: string;
  /** Existing client-side navigation handler; runs only for a plain left click. */
  onNavigate?: () => void;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

/** A real `<a href>` crawlers and browsers understand, with instant SPA navigation on a plain click. */
export const InternalLink = React.forwardRef<HTMLAnchorElement, InternalLinkProps>(function InternalLink({ href, onNavigate, onClick, children, ...rest }, ref) {
  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      data-internal-link=""
      onClick={event => {
        onClick?.(event);
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
});
