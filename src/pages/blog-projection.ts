import type { Language, BlogPost } from '../types';
import type { CmsDocument } from '../cms/schema';
import { articleOverride } from '../cms/article-format';

const blank = { en: '', fr: '', es: '' };

export const blogImageSource = (document: CmsDocument | null | undefined, mediaId: string | undefined) => document?.media.find(media => media.id === mediaId)?.src;

/** Posts that may be shown: published, and (in CMS mode) backed by an enabled page of the same id. */
export function visibleBlogPosts(document: CmsDocument | null | undefined, fallback: BlogPost[]): BlogPost[] {
  return (document?.blogPosts ?? fallback).filter(post => post.published !== false && (!document || document.pages.some(page => page.id === post.id && page.enabled)));
}

/** The post as the CMS page currently authors it (title, cover, excerpt, body); the raw record without a document. */
export function projectBlogPost(document: CmsDocument | null | undefined, post: BlogPost): BlogPost {
  if (!document) return post;
  const page = document.pages.find(page => page.id === post.id);
  const cover = page?.sections.find(section => section.id === 'cover' && section.type === 'gallery');
  const content = page?.sections.find(section => section.id === 'content' && section.type === 'richText');
  const excerpt = page?.sections.find(section => section.id === 'excerpt' && section.type === 'richText');
  const body = (blocks: Extract<NonNullable<typeof content>, { type: 'richText' }>['blocks']) => Object.fromEntries(['en', 'fr', 'es'].map(locale => [locale, blocks.map(block => 'text' in block ? block.text[locale as Language] : block.items[locale as Language].join('\n')).join('\n\n')])) as BlogPost['content'];
  return { ...post, title: page?.title ?? blank,
    coverImage: cover?.type === 'gallery' && cover.enabled ? blogImageSource(document, cover.images[0]?.mediaId) ?? '' : '',
    content: content?.type === 'richText' && content.enabled ? Object.fromEntries(['en', 'fr', 'es'].map(locale => [locale, articleOverride(post, content, locale as Language) ?? body(content.blocks)[locale as Language]])) as BlogPost['content'] : blank,
    excerpt: excerpt?.type === 'richText' ? excerpt.enabled ? body(excerpt.blocks) : blank : post.excerpt };
}
