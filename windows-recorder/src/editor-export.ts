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
/** Real-time browser fallback. Native hardware encoding remains a separate requirement. */
export async function exportEdit(document:EditDocument,url:string,signal:AbortSignal,progress:(value:number)=>void):Promise<Blob> {
 if(!document.segments.length)throw new Error('The timeline is empty.');
 const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw new Error('WebM export is unsupported by this runtime.');
 const video=documentCreateVideo();const canvas=window.document.createElement('canvas');
 let context:AudioContext|undefined,output:MediaStream|undefined,recorder:MediaRecorder|undefined;
 const chunks:Blob[]=[];
 try {
  await waitFor(video,'loadeddata',signal,()=>{video.src=url;video.load()});
  renderFrame(canvas,video,document.appearance,document.segments[0],document,0);
  output=canvas.captureStream(30);
  context=new AudioContext();const audio=context.createMediaElementSource(video),gain=context.createGain(),destination=context.createMediaStreamDestination();
  audio.connect(gain);gain.connect(destination);await context.resume();destination.stream.getTracks().forEach(t=>output!.addTrack(t));
  recorder=new MediaRecorder(output,{mimeType:mime,videoBitsPerSecond:8_000_000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  let encoderError:Error|null=null;recorder.onerror=()=>{encoderError=new Error('Video encoder failed.');};
  let completed=0;const total=timelineDuration(document.segments);
  for(const segment of document.segments){
   if(signal.aborted)throw new DOMException('Export cancelled.','AbortError');
   video.pause();if(recorder.state==='recording')recorder.pause();video.playbackRate=segment.speed;gain.gain.value=segment.freeze===undefined?segment.volume*fadeEnvelope(segment,0):0;
   const sourceTime=segment.freeze??segment.sourceIn;
   if(Math.abs(video.currentTime-sourceTime)>0.0001)await waitFor(video,'seeked',signal,()=>{video.currentTime=sourceTime});
   // loadeddata/seeked can fire before a drawable frame reaches the compositor.
   // Wait for an actual presented frame before starting or resuming output capture.
   await presentedFrame(video,signal);if(segment.freeze!==undefined)video.pause();
   if(segment.freeze===undefined&&video.currentTime>=segment.sourceOut)throw new Error('No drawable source frame exists in this clip range.');
   renderFrame(canvas,video,document.appearance,segment,document,completed);
   if(recorder.state==='inactive')recorder.start(250);else recorder.resume();
   
   const started=performance.now();
   await new Promise<void>((resolve,reject)=>{
    let handle=0;let lastTime=video.currentTime,lastAdvance=performance.now();
    const cleanup=()=>{cancelAnimationFrame(handle);signal.removeEventListener('abort',abort)};
    const abort=()=>{cleanup();reject(new DOMException('Export cancelled.','AbortError'))};signal.addEventListener('abort',abort,{once:true});
    const tick=()=>{
     if(signal.aborted){abort();return;}
     if(encoderError){cleanup();reject(encoderError);return;}
     if(video.currentTime!==lastTime){lastTime=video.currentTime;lastAdvance=performance.now();}
     if(segment.freeze===undefined&&performance.now()-lastAdvance>15000){cleanup();reject(new Error('Video playback stalled during export.'));return;}
     const localTime=segment.freeze===undefined?(video.currentTime-segment.sourceIn)/segment.speed:(performance.now()-started)/1000;
     if(localTime>=segmentDuration(segment)||(segment.freeze===undefined&&video.ended)){video.pause();cleanup();resolve();return;}
     gain.gain.setValueAtTime(segment.freeze===undefined?segment.volume*fadeEnvelope(segment,localTime):0,context!.currentTime);
     renderFrame(canvas,video,document.appearance,segment,document,completed+localTime);progress(Math.min(0.999,(completed+localTime)/total));handle=requestAnimationFrame(tick);
    };tick();
   });
   completed+=(segment.sourceOut-segment.sourceIn)/segment.speed;
  }
  await new Promise<void>((resolve,reject)=>{recorder!.onstop=()=>resolve();recorder!.onerror=()=>reject(new Error('Video encoder finalization failed.'));recorder!.stop()});
  if(encoderError)throw encoderError;const blob=new Blob(chunks,{type:mime});if(!blob.size)throw new Error('The video encoder produced no media frames; source time '+video.currentTime+' of '+video.duration);progress(1);return blob;
 } finally {
  video.pause();if(recorder&&recorder.state!=='inactive')recorder.stop();output?.getTracks().forEach(t=>t.stop());await context?.close();video.removeAttribute('src');video.load();video.remove();
 }
}