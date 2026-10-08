import {validateDocument,type EditDocument} from './timeline.ts';
const MAGIC=new TextEncoder().encode('FRAMEFLOWPKG1');
const MAX_HEADER=1024*1024,MAX_MEDIA=512*1024*1024;
type Manifest={format:'frameflow-project';version:1;document:EditDocument;media:{name:string;mimeType:string;duration:number;size:number;sha256:string}};