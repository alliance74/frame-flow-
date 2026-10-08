export type Crop={x:number;y:number;width:number;height:number};
export type Segment = {id:string; sourceIn:number; sourceOut:number; speed:number; volume:number; opacity:number;crop?:Crop;rotation?:0|90|180|270;mirror?:boolean;fadeIn?:number;fadeOut?:number;freeze?:number;effectRange?:{offset:number;duration:number}};
export type Appearance = {background:string; padding:number; radius:number; width:number; height:number};
import type {CameraKeyframe} from './camera';
export type Annotation={id:string;kind:'text'|'rectangle'|'circle'|'arrow'|'line'|'highlight'|'blur'|'pixelate';text:string;color:string;x:number;y:number;width:number;height:number;start:number;end:number};
export type EditDocument = {version:1; mediaId:string; name:string; segments:Segment[]; appearance:Appearance; annotations?:Annotation[]; camera?:CameraKeyframe[]};
export const segmentDuration = (s:Segment) => (s.sourceOut-s.sourceIn)/s.speed;
export const timelineDuration = (segments:Segment[]) => segments.reduce((sum,s)=>sum+segmentDuration(s),0);
export function locate(segments:Segment[],time:number) {
  let start=0;
  for(const segment of segments){const end=start+segmentDuration(segment);if(time>=start&&time<end)return {segment,start,sourceTime:segment.freeze??segment.sourceIn+(time-start)*segment.speed};start=end;}
  return null;
}
export function split(segments:Segment[],id:string,offset:number,newId:string):Segment[] {
  return segments.flatMap(s=>{
    if(s.id!==id)return [s];
    if(!Number.isFinite(offset)||offset<=0||offset>=segmentDuration(s))throw new Error('Split must be inside the clip.');
    const cut=s.sourceIn+offset*s.speed;
    const left={...s,sourceOut:cut},right={...s,id:newId,sourceIn:cut};
    if(s.fadeIn||s.fadeOut){const range=s.effectRange??{offset:0,duration:segmentDuration(s)};left.effectRange={...range};right.effectRange={offset:range.offset+offset,duration:range.duration};}
    return [left,right];
  });
}
export function validateDocument(value:unknown,mediaId:string,duration:number):EditDocument {
  const d=value as EditDocument;
  if(!d||d.version!==1||typeof d.mediaId!=='string'||!/^[a-z0-9_-]{1,128}$/i.test(d.mediaId)||d.mediaId!==mediaId||typeof d.name!=='string'||d.name.length>1024||!Number.isFinite(duration)||duration<0||!Array.isArray(d.segments)||d.segments.length>10000)throw new Error('Invalid project document.');
  const ids=new Set<string>();
  for(const s of d.segments){
    if(!s||typeof s.id!=='string'||ids.has(s.id)||![s.sourceIn,s.sourceOut,s.speed,s.volume,s.opacity].every(Number.isFinite)||s.sourceIn<0||s.sourceOut>duration+0.001||s.sourceOut<=s.sourceIn||s.speed<0.25||s.speed>4||s.volume<0||s.volume>1||s.opacity<0||s.opacity>1)throw new Error('Invalid timeline clip.');
    ids.add(s.id);
    const crop=s.crop;
    if(crop&&(![crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>1.000001||crop.y+crop.height>1.000001))throw new Error('Invalid crop.');
    if(s.rotation!==undefined&&![0,90,180,270].includes(s.rotation))throw new Error('Invalid rotation.');
    if(s.mirror!==undefined&&typeof s.mirror!=='boolean')throw new Error('Invalid mirror setting.');
    if(s.effectRange&&(![s.effectRange.offset,s.effectRange.duration].every(Number.isFinite)||s.effectRange.offset<0||s.effectRange.duration<=0||s.effectRange.offset+segmentDuration(s)>s.effectRange.duration+0.000001))throw new Error('Invalid fade timing range.');
    if([s.fadeIn,s.fadeOut].some(f=>f!==undefined&&(!Number.isFinite(f)||f<0||f>(s.effectRange?.duration??segmentDuration(s)))))throw new Error('Fade duration exceeds clip duration.');
    if(s.freeze!==undefined&&(!Number.isFinite(s.freeze)||s.freeze<0||s.freeze>=duration))throw new Error('Freeze frame must be inside the original media.');
  }
  const a=d.appearance;
  if(!a||!/^#[0-9a-f]{6}$/i.test(a.background)||![a.padding,a.radius,a.width,a.height].every(Number.isFinite)||a.padding<0||a.padding>0.3||a.radius<0||a.radius>200||a.width<128||a.width>3840||a.height<128||a.height>3840||!Number.isInteger(a.width)||!Number.isInteger(a.height))throw new Error('Invalid appearance settings.');
  if(d.annotations!==undefined){if(!Array.isArray(d.annotations)||d.annotations.length>1000)throw new Error('Invalid annotations.');const ids=new Set<string>();for(const a of d.annotations){if(!a||typeof a.id!=='string'||ids.has(a.id)||!['text','rectangle','circle','arrow','line','highlight','blur','pixelate'].includes(a.kind)||typeof a.text!=='string'||a.text.length>10000||!/^#[0-9a-f]{6}$/i.test(a.color)||![a.x,a.y,a.width,a.height,a.start,a.end].every(Number.isFinite)||a.x<0||a.y<0||a.width<=0||a.height<=0||a.x+a.width>1.001||a.y+a.height>1.001||a.start<0||a.end<=a.start)throw new Error('Invalid annotation.');ids.add(a.id);}}
  if(d.camera!==undefined){if(!Array.isArray(d.camera)||d.camera.length>10000)throw new Error('Invalid camera keyframes.');const times=new Set<number>();for(const f of d.camera){if(!f||![f.time,f.x,f.y,f.zoom].every(Number.isFinite)||f.time<0||times.has(f.time)||f.x<0||f.x>1||f.y<0||f.y>1||f.zoom<1||f.zoom>5||!['linear','smooth'].includes(f.easing))throw new Error('Invalid camera keyframe.');times.add(f.time);}}
  return structuredClone(d);
}
export function createDocument(mediaId:string,name:string,duration:number):EditDocument {
  return {version:1,mediaId,name,segments:duration>0?[{id:crypto.randomUUID(),sourceIn:0,sourceOut:duration,speed:1,volume:1,opacity:1}]:[],appearance:{background:'#6965ca',padding:0.06,radius:18,width:1280,height:720}};
}