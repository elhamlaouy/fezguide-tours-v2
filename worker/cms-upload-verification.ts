import {CmsError} from './cms-store';
import {MAX_MEDIA_BYTES,MEDIA_KEY_PATTERN} from './media';
import type {PreparedPublicEnv} from './prepared-public';

export type UploadReceipt = {etag:string;version:string;bytes:number;contentType:string;digest?:string};
export type UploadObject = {key?:string;etag?:string;version?:string;size?:number;httpMetadata?:{contentType?:string};customMetadata?:Record<string,string>;checksums?:{sha256?:ArrayBuffer};body?:ReadableStream|null};
const invalid=():never=>{throw new CmsError(422,'upload_verification_failed');};
export function managedUploadKey(src:string,origin:string):string|null {
  if(!src.startsWith('/media/upload-')&&!src.startsWith(`${origin}/media/upload-`))return null;
  const url=new URL(src,origin);
  if(url.origin!==origin||!url.pathname.startsWith('/media/upload-'))return invalid();
  return url.pathname.slice('/media/'.length);
}
export function requireKnownUploadReferences(value:unknown,sources:ReadonlyMap<unknown,unknown>,origin:string):void {
  if(Array.isArray(value))value.forEach(item=>requireKnownUploadReferences(item,sources,origin));
  else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)) {if(key!=='media')requireKnownUploadReferences(item,sources,origin);}
  else if(typeof value==='string'&&managedUploadKey(value,origin)!==null&&!sources.has(value))invalid();
}
export function uploadReceipt(key:string,object:UploadObject|null):UploadReceipt {
  const contentType=key.endsWith('.jpg')?'image/jpeg':key.endsWith('.png')?'image/png':'image/webp';
  const uploaded=object?.customMetadata?.uploadedAt;
  if(!MEDIA_KEY_PATTERN.test(key)||!object||object.key!==`uploads/${key}`||typeof object.etag!=='string'||!object.etag||object.etag.length>128||typeof object.version!=='string'||!object.version||object.version.length>128||
    !Number.isSafeInteger(object.size)||object.size!<1||object.size!>MAX_MEDIA_BYTES||object.httpMetadata?.contentType!==contentType||
    !uploaded||!Number.isFinite(Date.parse(uploaded))||new Date(uploaded).toISOString()!==uploaded) return invalid();
  const checksum=object.checksums?.sha256;
  if(checksum&&checksum.byteLength!==32)return invalid();
  return {etag:object.etag,version:object.version,bytes:object.size!,contentType,
    ...(checksum?{digest:Array.from(new Uint8Array(checksum),b=>b.toString(16).padStart(2,'0')).join('')}:{})};
}

export async function serveVerifiedUpload(key:string,request:Request,bucket:NonNullable<PreparedPublicEnv['CMS_MEDIA']>,receiptJson:string):Promise<Response> {
  const receipt=JSON.parse(receiptJson) as UploadReceipt;
  const object=await bucket.get(`uploads/${key}`,{onlyIf:{etagMatches:receipt.etag}});
  if(!object)throw new CmsError(404,'not_found');
  try {
    const current=uploadReceipt(key,object as UploadObject);
    if(!object.body||current.etag!==receipt.etag||current.version!==receipt.version||current.bytes!==receipt.bytes||current.contentType!==receipt.contentType||current.digest!==receipt.digest)throw new Error();
  }catch{
    await object.body?.cancel().catch(()=>{});throw new CmsError(503,'media_unavailable');
  }
  if(request.method==='HEAD')await object.body!.cancel().catch(()=>{});
  return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':receipt.contentType,'Content-Length':String(receipt.bytes),
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Disposition':'inline'}});
}
