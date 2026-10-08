export type Crop={x:number;y:number;width:number;height:number};
export type Segment = {id:string; sourceIn:number; sourceOut:number; speed:number; volume:number; opacity:number;crop?:Crop;rotation?:0|90|180|270;mirror?:boolean;fadeIn?:number;fadeOut?:number;freeze?:number;effectRange?:{offset:number;duration:number}};
export type Appearance = {background:string; padding:number; radius:number; width:number; height:number};
import type {CameraKeyframe} from './camera';
export type Annotation={id:string;kind:'text'|'rectangle'|'circle'|'arrow'|'line'|'highlight'|'blur'|'pixelate';text:string;color:string;x:number;y:number;width:number;height:number;start:number;end:number};
export type EditDocument = {version:1; mediaId:string; name:string; segments:Segment[]; appearance:Appearance; annotations?:Annotation[]; camera?:CameraKeyframe[]};
export const segmentDuration = (s:Segment) => (s.sourceOut-s.sourceIn)/s.speed;
export const timelineDuration = (segments:Segment[]) => segments.reduce((sum,s)=>sum+segmentDuration(s),0);