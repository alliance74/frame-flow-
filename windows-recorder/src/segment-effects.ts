import {segmentDuration,type Segment} from './timeline.ts';
export function fadeEnvelope(segment:Segment,localTime:number){
 const duration=segment.effectRange?.duration??segmentDuration(segment),t=Math.max(0,Math.min(duration,localTime+(segment.effectRange?.offset??0)));
 const fadeIn=segment.fadeIn??0,fadeOut=segment.fadeOut??0;
 return Math.min(1,fadeIn>0?t/fadeIn:1,fadeOut>0?(duration-t)/fadeOut:1);
}