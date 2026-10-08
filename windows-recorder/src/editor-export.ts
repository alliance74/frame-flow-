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
function presentedFrame(video:HTMLVideoElement,signal:AbortSignal):Promise<void>{
 return new Promise((resolve,reject)=>{
  let callback=0;const cleanup=()=>{clearTimeout(timeout);video.cancelVideoFrameCallback(callback);signal.removeEventListener('abort',abort)};
  const abort=()=>{cleanup();reject(new DOMException('Export cancelled.','AbortError'))};
  const timeout=setTimeout(()=>{cleanup();reject(new Error('No decoded video frame was presented.'))},15000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
  callback=video.requestVideoFrameCallback(()=>{cleanup();resolve()});
  void video.play().catch(error=>{cleanup();reject(error)});
 });
}