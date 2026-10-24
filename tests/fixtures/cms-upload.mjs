import {createHash} from 'node:crypto';
export const IMAGE_FIXTURES={"png":"iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGNcpRHAwMDAwMDAxAADABT6ASa2hsqRAAAAAElFTkSuQmCC","jpeg":"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkqKKKk+3P/9k=","webp":"UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoDAAIAAUAmJaACdAFAAAD+8Pn4qf/XAf/84D//nAfw1AAA"};
export function fixtureUpload(src){
 const key=src.slice('/media/'.length),ext=key.split('.').pop();
 const bytes=Buffer.from(IMAGE_FIXTURES[ext==='jpg'?'jpeg':ext],'base64');
 const digest=createHash('sha256').update(bytes).digest('hex');
 return {key:`uploads/${key}`,bytes,etag:digest,version:'controlled-upload-v1',size:bytes.length,
   httpMetadata:{contentType:ext==='jpg'?'image/jpeg':`image/${ext}`},customMetadata:{uploadedAt:'2026-10-21T00:00:00.000Z'},checksums:{sha256:Uint8Array.from(Buffer.from(digest,'hex')).buffer}};
}
