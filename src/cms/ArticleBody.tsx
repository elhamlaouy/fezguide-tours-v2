import React, { useMemo } from 'react';
import type { Language } from '../types';
import type { CmsDocument } from './schema';
import { ARTICLE_IMAGE_SIZES, articleMedia, parseArticle, type ArticleBlock, type ArticleSpan } from './article-format';
import { responsiveImageProps } from './optimized-image';

/** Legacy plain-text layout, kept byte-for-byte for posts without article formatting. */
export const PLAIN_ARTICLE_CLASS = 'text-sm text-[#42504E] leading-relaxed whitespace-pre-line space-y-4';

function Spans({ spans }: { spans: ArticleSpan[] }): React.ReactElement {
  return <>{spans.map((span, index) => {
    if (span.t === 'text') return <React.Fragment key={index}>{span.text}</React.Fragment>;
    if (span.t === 'strong') return <strong key={index}><Spans spans={span.children} /></strong>;
    if (span.t === 'em') return <em key={index}><Spans spans={span.children} /></em>;
    const external = span.href.startsWith('https://');
    return <a key={index} href={span.href} {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}><Spans spans={span.children} /></a>;
  })}</>;
}

function Block({ block, document, language }: { block: ArticleBlock; document?: CmsDocument | null; language: Language }): React.ReactElement | null {
  switch (block.type) {
    case 'heading': return block.level === 2 ? <h2><Spans spans={block.spans} /></h2> : <h3><Spans spans={block.spans} /></h3>;
    case 'paragraph': return <p><Spans spans={block.spans} /></p>;
    case 'quote': return <blockquote><Spans spans={block.spans} /></blockquote>;
    case 'list': {
      const items = block.items.map((item, index) => <li key={index}><Spans spans={item} /></li>);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case 'image': {
      const media = articleMedia(document, block.mediaId, block.alt, block.caption, language);
      if (!media) return null; // unknown or unusable photo: render nothing
      return <figure data-media-id={block.mediaId}>
        <img {...responsiveImageProps(media.src, ARTICLE_IMAGE_SIZES)} alt={media.alt} width={media.width} height={media.height} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>;
    }
  }
}

/**
 * The article body of a blog post for one language. Text without any article syntax keeps the
 * original plain layout (identical DOM to before); otherwise it is rendered from the typed tree.
 * Nothing here ever touches innerHTML: all CMS text is a React text node.
 */
export const ArticleBody: React.FC<{ text: string; language: Language; document?: CmsDocument | null; className?: string; plain?: boolean }> = ({ text, language, document, className, plain }) => {
  const article = useMemo(() => plain ? { blocks: [], formatted: false } : parseArticle(text), [text, plain]);
  if (!article.formatted) return <div className={className ?? PLAIN_ARTICLE_CLASS}>{text}</div>;
  return <div className="article-body">{article.blocks.map((block, index) => <Block key={index} block={block} document={document} language={language} />)}</div>;
};
