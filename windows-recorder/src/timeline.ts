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