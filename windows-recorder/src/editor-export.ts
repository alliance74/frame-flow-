import {renderFrame} from './canvas-renderer';
import {segmentDuration,timelineDuration,type EditDocument} from './timeline';
import {fadeEnvelope} from './segment-effects';
function waitFor(video:HTMLVideoElement,event:string,signal:AbortSignal,action:()=>void):Promise<void> {
 return new Promise((resolve,reject)=>{
  const finish=(error?:unknown)=>{clearTimeout(timeout);video.removeEventListener(event,done);video.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);error?reject(error):resolve();};
  const done=()=>finish(),failed=()=>finish(new Error('Video decoding failed: '+(video.error?.message??'unknown media error'))),aborted=()=>finish(new DOMException('Export cancelled.','AbortError'));
  const timeout=setTimeout(()=>finish(new Error('Video decoding timed out.')),15000);
  video.addEventListener(event,done,{once:true});video.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});
  if(signal.aborted){aborted();return;}try{action()}catch(e){finish(e)}
 });
}