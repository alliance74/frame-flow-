import type {Appearance,Segment,EditDocument} from './timeline';
import {sampleCamera} from './camera';
import {fadeEnvelope,segmentStart} from './segment-effects';
/** Preview, screenshots and fallback export use this exact composition. */
export function renderFrame(canvas:HTMLCanvasElement,video:HTMLVideoElement|HTMLImageElement,appearance:Appearance,segment:Segment|null,document?:EditDocument,time=0) {
  if(canvas.width!==appearance.width)canvas.width=appearance.width;
  if(canvas.height!==appearance.height)canvas.height=appearance.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas rendering is unavailable.');
  const {width,height,padding,radius,background}=appearance;
  ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
  const sourceWidth=video instanceof HTMLVideoElement?video.videoWidth:video.naturalWidth;
  const sourceHeight=video instanceof HTMLVideoElement?video.videoHeight:video.naturalHeight;
  if(!segment||!sourceWidth||(video instanceof HTMLVideoElement&&video.readyState<2))return;
  const inset=Math.min(width,height)*padding;
  const crop=segment.crop??{x:0,y:0,width:1,height:1},cw=sourceWidth*crop.width,ch=sourceHeight*crop.height;
  const rotation=segment.rotation??0,swapped=rotation===90||rotation===270;
  const scale=Math.min((width-2*inset)/(swapped?ch:cw),(height-2*inset)/(swapped?cw:ch));
  const w=(swapped?ch:cw)*scale,h=(swapped?cw:ch)*scale,x=(width-w)/2,y=(height-h)/2;
  const camera=sampleCamera(document?.camera??[],time),sw=cw/camera.zoom,sh=ch/camera.zoom;
  const localTime=time-(document?segmentStart(document.segments,segment.id):0);
  ctx.save();ctx.globalAlpha=segment.opacity*fadeEnvelope(segment,localTime);ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(radius,w/2,h/2));ctx.clip();ctx.translate(width/2,height/2);ctx.rotate(rotation*Math.PI/180);if(segment.mirror)ctx.scale(-1,1);ctx.drawImage(video,crop.x*sourceWidth+camera.x*cw-sw/2,crop.y*sourceHeight+camera.y*ch-sh/2,sw,sh,-cw*scale/2,-ch*scale/2,cw*scale,ch*scale);ctx.restore();
  for(const a of document?.annotations??[]){
   if(time<a.start||time>=a.end)continue;
   const ax=a.x*width,ay=a.y*height,aw=a.width*width,ah=a.height*height;
   ctx.save();ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.lineWidth=Math.max(2,width/320);
   switch(a.kind){
    case 'text':ctx.font=`600 ${Math.max(12,ah)}px Segoe UI`;ctx.textBaseline='top';ctx.fillText(a.text,ax,ay,aw);break;
    case 'rectangle':ctx.strokeRect(ax,ay,aw,ah);break;
    case 'circle':ctx.beginPath();ctx.ellipse(ax+aw/2,ay+ah/2,aw/2,ah/2,0,0,Math.PI*2);ctx.stroke();break;
    case 'highlight':ctx.globalAlpha=0.3;ctx.fillRect(ax,ay,aw,ah);break;
    case 'line':case 'arrow':{
     ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+aw,ay+ah);ctx.stroke();
     if(a.kind==='arrow'){const angle=Math.atan2(ah,aw),head=Math.max(12,width/70);ctx.beginPath();ctx.moveTo(ax+aw,ay+ah);ctx.lineTo(ax+aw-head*Math.cos(angle-0.5),ay+ah-head*Math.sin(angle-0.5));ctx.lineTo(ax+aw-head*Math.cos(angle+0.5),ay+ah-head*Math.sin(angle+0.5));ctx.closePath();ctx.fill();}break;
    }
    case 'blur':case 'pixelate':{
     const buffer=window.document.createElement('canvas');buffer.width=a.kind==='pixelate'?Math.max(1,Math.ceil(aw/16)):Math.ceil(aw);buffer.height=a.kind==='pixelate'?Math.max(1,Math.ceil(ah/16)):Math.ceil(ah);
     buffer.getContext('2d')?.drawImage(canvas,ax,ay,aw,ah,0,0,buffer.width,buffer.height);
     ctx.beginPath();ctx.rect(ax,ay,aw,ah);ctx.clip();ctx.imageSmoothingEnabled=a.kind!=='pixelate';if(a.kind==='blur')ctx.filter='blur(12px)';ctx.drawImage(buffer,ax,ay,aw,ah);break;
    }
   }ctx.restore();
  }
}
