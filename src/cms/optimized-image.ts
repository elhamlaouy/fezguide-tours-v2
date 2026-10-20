import derivatives from './optimized-images.json';

interface ResponsiveImage {
  width: number;
  height: number;
  sourceHash: string;
  candidates: { src: string; width: number }[];
}

/** Build-time derivatives of the exact same photos; uploads and unknown sources stay unchanged. */
export function optimizedImageSrc(src: string): string {
  return Object.hasOwn(derivatives, src) ? (derivatives as Record<string, ResponsiveImage>)[src].candidates.at(-1)?.src ?? src : src;
}

/** Only known build artifacts enter srcset; private uploads retain their authenticated URL. */
export function responsiveImageProps(src: string, sizes: string, preferNative = false): { src: string; srcSet?: string; sizes?: string } {
  if (!Object.hasOwn(derivatives, src)) return { src };
  const image = (derivatives as Record<string, ResponsiveImage>)[src];
  // ponytail: authored cover heights vary; keep native quality until a height-aware selection exists.
  return { src, srcSet: image.candidates.map(candidate => `${candidate.src} ${candidate.width}w`).join(', '), sizes: preferNative ? `${image.width}px` : sizes };
}

/** Existing authored grids: max-w-7xl includes responsive gutters; image slots exclude the 1px card border. */
export function authoredCardImageSizes(src: string, layout?: string): string {
  const image = Object.hasOwn(derivatives, src) ? (derivatives as Record<string, ResponsiveImage>)[src] : undefined;
  const quick = layout === 'quick-navigation';
  const home = quick || layout === 'home';
  const mediumColumns = layout === 'travel-tips' ? 3 : home || ['fez', 'day-trips', 'food-tours'].includes(layout ?? '') ? 2 : 1;
  const scale = image ? Math.max(1, (image.width / image.height) / (4 / 3)) : 1;
  const slot = (columns: number, padding: number) => {
    const width = `calc((min(80rem, 100vw) - ${padding + (columns - 1) * (home ? 1.5 : 2)}rem) / ${columns} - 2px)`;
    // object-fit:cover needs max(slot width, slot height × source aspect ratio), before browser DPR selection.
    return quick && image ? `max(${width}, ${11 * image.width / image.height}rem)` : scale === 1 ? width : `calc(${width} * ${scale})`;
  };
  return [
    ...(layout === 'fez' ? [`(min-width: 80rem) ${slot(4, 4)}`] : []),
    `(min-width: 64rem) ${slot(home ? 3 : mediumColumns, 4)}`,
    `(min-width: 48rem) ${slot(mediumColumns, 3)}`,
    `(min-width: 40rem) ${slot(1, 3)}`,
    slot(1, 2),
  ].join(', ');
}

/** Matches cms-renderer.css: 2rem gutters, 1rem card gaps, auto-fit and a 720px split breakpoint. */
export function imageSizes(containerWidth: number, family: 'banner' | 'split' | 'card' | 'wide' = 'wide', count = 1, featured = false, src?: string): string {
  const container = Number.isFinite(containerWidth) ? Math.max(960, Math.min(1600, containerWidth)) : 1280;
  if (family === 'banner') return '100vw';
  const wrap = `min(${container}px, calc(100vw - 2rem))`;
  if (family === 'split') return `(min-width: 721px) calc((${wrap} - 1.5rem) * 0.475), ${wrap}`;
  if (family !== 'card') return wrap; // Galleries may have one wide item: never assume a fixed column count.
  const image = src && Object.hasOwn(derivatives, src) ? (derivatives as Record<string, ResponsiveImage>)[src] : undefined;
  const scale = image ? Math.max(1, (image.width / image.height) / (4 / 3)) : 1;
  const minimum = featured ? 20 : 16.5;
  const columns = Math.min(Math.max(1, Math.floor(count)), Math.floor((container + 16) / (minimum * 16 + 16)));
  const sizes = [];
  for (let n = columns; n > 1; n--) sizes.push(`(min-width: ${n * minimum + n + 1}rem) calc((${wrap} - ${n - 1}rem) / ${n} * ${scale})`);
  return [...sizes, scale === 1 ? wrap : `calc(${wrap} * ${scale})`].join(', ');
}
