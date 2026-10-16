import derivatives from './optimized-images.json';

/** Build-time derivatives of the exact same photos; uploads and unknown sources stay unchanged. */
export function optimizedImageSrc(src: string): string {
  return (derivatives as Record<string, string>)[src] ?? src;
}
