import {validateDocument,type EditDocument} from './timeline.ts';
const MAGIC=new TextEncoder().encode('FRAMEFLOWPKG1');
const MAX_HEADER=1024*1024,MAX_MEDIA=512*1024*1024;
type Manifest={format:'frameflow-project';version:1;document:EditDocument;media:{name:string;mimeType:string;duration:number;size:number;sha256:string}};
export type ProjectPackage={document:EditDocument;media:Blob;name:string;duration:number};
async function hash(blob:Blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function validateMedia(media:Manifest['media']){
 if(!media||typeof media.name!=='string'||!media.name.trim()||media.name.length>1024||typeof media.mimeType!=='string'||!/^video\/[a-z0-9.+-]+(?:;[^\r\n]*)?$/i.test(media.mimeType)||media.mimeType.length>256||!Number.isFinite(media.duration)||media.duration<=0||!Number.isSafeInteger(media.size)||media.size<=0||media.size>MAX_MEDIA||!/^[0-9a-f]{64}$/.test(media.sha256))throw new Error('Invalid package media metadata.');
}
/** Binary container: magic, big-endian JSON byte length, JSON manifest, original media bytes. */
export async function packProject(document:EditDocument,media:Blob,name:string,duration:number):Promise<Blob>{
 if(!media.size||media.size>MAX_MEDIA)throw new Error('Project packages currently support media up to 512 MiB.');
 const valid=validateDocument(document,document.mediaId,duration);
 const manifest:Manifest={format:'frameflow-project',version:1,document:valid,media:{name,mimeType:media.type,duration,size:media.size,sha256:await hash(media)}};validateMedia(manifest.media);
 const json=new TextEncoder().encode(JSON.stringify(manifest));if(json.length>MAX_HEADER)throw new Error('Project document is too large to package.');
 const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,json.length);
 return new Blob([MAGIC,length,json,media],{type:'application/x-frameflow-project'});
}