import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';
// Use a deterministically encoded input: headless canvas MediaRecorder can defer all source frames.
const fixtureDirectory=await mkdtemp(join(tmpdir(),'frameflow-test-')),fixturePath=join(fixtureDirectory,'source.mp4');
const frames=[];for(let frame=0;frame<60;frame++){const rgb=Buffer.alloc(320*180*3);for(let y=0;y<180;y++)for(let x=0;x<320;x++){const i=(y*320+x)*3,white=y>=30&&y<60&&x>=frame*3&&x<frame*3+30;rgb[i]=white?255:0;rgb[i+1]=white?255:187;rgb[i+2]=white?255:85;}frames.push(rgb);}
await new Promise((resolve,reject)=>{const ffmpeg=spawn(process.env.FRAMEFLOW_FFMPEG??'ffmpeg',['-y','-f','rawvideo','-pix_fmt','rgb24','-s','320x180','-r','30','-i','pipe:0','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-strict','experimental','-b:a','128k','-movflags','+faststart',fixturePath],{windowsHide:true,stdio:['pipe','ignore','pipe']});let stderr='';ffmpeg.stderr.on('data',data=>stderr+=data);ffmpeg.on('error',reject);ffmpeg.on('close',code=>code===0?resolve():reject(new Error(stderr)));ffmpeg.stdin.on('error',reject);ffmpeg.stdin.end(Buffer.concat(frames));});
const fixtureBytes=await readFile(fixturePath);
const {chromium}=await import(process.env.FRAMEFLOW_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:1420');
 await page.evaluate(async base64=>{const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0)),blob=new Blob([bytes],{type:'video/mp4'});const {recordingStore}=await import('/src/recording-store.ts');await recordingStore.save({id:'browser-test',name:'Browser integration',blob,duration:2,createdAt:new Date().toISOString()})},fixtureBytes.toString('base64'));
 await page.reload();await page.getByRole('heading',{name:'Timeline editor — Browser integration'}).waitFor();
 await page.getByRole('button',{name:'Split at playhead',exact:true}).waitFor();
 const checks=await page.evaluate(async()=>{
  const {createDocument}=await import('/src/timeline.ts');const {exportEdit}=await import('/src/editor-export.ts');const {recordingStore}=await import('/src/recording-store.ts');
  const source=(await recordingStore.list()).find(r=>r.id==='browser-test');const url=URL.createObjectURL(source.blob),doc=createDocument(source.id,source.name,source.duration);
  doc.appearance.background='#112233';doc.appearance.padding=0.2;doc.annotations=[{id:'rect',kind:'highlight',text:'',color:'#ff0000',x:0,y:0,width:0.1,height:0.1,start:0,end:1}];
  let progress=0;const result=await exportEdit(doc,url,new AbortController().signal,value=>progress=value);
  const exported=document.createElement('video'),outUrl=URL.createObjectURL(result);exported.src=outUrl;await new Promise((resolve,reject)=>{exported.onloadeddata=resolve;exported.onerror=()=>reject(new Error('Export decode failed: '+exported.error?.message+'; blob '+result.size+' bytes'))});
  await exported.play();await new Promise(resolve=>setTimeout(resolve,250));exported.pause();const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');ctx.drawImage(exported,0,0);
  const background=[...ctx.getImageData(1200,650,1,1).data],content=[...ctx.getImageData(640,360,1,1).data],highlight=[...ctx.getImageData(20,20,1,1).data];
  const audioContext=new AudioContext();const rms=async blob=>{const decoded=await audioContext.decodeAudioData(await blob.arrayBuffer());const channel=decoded.getChannelData(0);return Math.sqrt(channel.reduce((sum,value)=>sum+value*value,0)/channel.length);};const audibleRms=await rms(result);
  doc.annotations=[];doc.segments[0].sourceIn=0.3;doc.segments[0].sourceOut=1.3;doc.segments[0].freeze=0.4;
  const frozen=await exportEdit(doc,url,new AbortController().signal,()=>{}),frozenUrl=URL.createObjectURL(frozen),frozenVideo=document.createElement('video');frozenVideo.src=frozenUrl;frozenVideo.muted=true;await new Promise((resolve,reject)=>{frozenVideo.onloadeddata=resolve;frozenVideo.onerror=()=>reject(new Error(frozenVideo.error?.message))});await frozenVideo.play();
  const waitTime=target=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Frozen export playback timed out.')),5000);const tick=()=>{if(frozenVideo.currentTime>=target){clearTimeout(timeout);resolve()}else requestAnimationFrame(tick)};tick();});
  await waitTime(0.35);ctx.drawImage(frozenVideo,0,0);const frozenFirst=[...ctx.getImageData(376,252,1,1).data];await waitTime(0.7);ctx.drawImage(frozenVideo,0,0);const frozenSecond=[...ctx.getImageData(376,252,1,1).data];const frozenRms=await rms(frozen);await audioContext.close();frozenVideo.pause();URL.revokeObjectURL(frozenUrl);
  const controller=new AbortController();controller.abort();let cancelled=false;try{await exportEdit(doc,url,controller.signal,()=>{})}catch(e){cancelled=e.name==='AbortError'}
  URL.revokeObjectURL(url);URL.revokeObjectURL(outUrl);return {size:result.size,progress,background,content,highlight,cancelled,width:exported.videoWidth,height:exported.videoHeight,audibleRms,frozenRms,frozenFirst,frozenSecond};
 });
 console.log(checks);assert.ok(checks.size>1000);assert.equal(checks.progress,1);assert.equal(checks.width,1280);assert.equal(checks.height,720);
 assert.ok(Math.abs(checks.background[0]-17)<15&&Math.abs(checks.background[1]-34)<15&&Math.abs(checks.background[2]-51)<15,'export background matches composition');
 assert.ok(checks.content[1]>100&&checks.content[1]>checks.content[0],'source media appears in export');assert.ok(checks.highlight[0]>checks.background[0]+30,'annotation appears in export');assert.ok(checks.cancelled);
 assert.ok(checks.audibleRms>0.02,'source audio is exported');assert.ok(checks.frozenRms<0.003,'frozen clip audio is muted');assert.ok(checks.frozenFirst[0]>220&&checks.frozenSecond[0]>220,'same selected source frame is held throughout freeze');
 await page.getByRole('button',{name:'rectangle',exact:true}).click();await page.getByRole('button',{name:'Add camera keyframe at playhead',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Delete annotation',exact:true}).waitFor();await page.getByRole('button',{name:'Delete keyframe',exact:true}).waitFor();
 const packageDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export project package',exact:true}).click();const projectFile=await packageDownload;const packageBytes=await readFile(await projectFile.path());assert.ok(packageBytes.length>1000);
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByLabel('Import project package').setInputFiles({name:'project.frameflow',mimeType:'application/x-frameflow-project',buffer:packageBytes});
 await page.waitForFunction(async()=>{const {recordingStore}=await import('/src/recording-store.ts');return (await recordingStore.list()).length===2});
 await page.getByRole('button',{name:'Duplicate project',exact:true}).click();await page.getByRole('heading',{name:'Timeline editor — Browser integration copy',exact:true}).waitFor();
 const projectCheck=await page.evaluate(async()=>{const {recordingStore}=await import('/src/recording-store.ts');const items=await recordingStore.list();return {count:items.length,edited:items.filter(r=>r.editDocument?.annotations?.length===1).length,ids:new Set(items.map(r=>r.id)).size};});assert.equal(projectCheck.count,3);assert.equal(projectCheck.edited,3);assert.equal(projectCheck.ids,3);
 const transformCheck=await page.evaluate(async()=>{
  const {createDocument}=await import('/src/timeline.ts'),{renderFrame}=await import('/src/canvas-renderer.ts');
  const source=document.createElement('canvas');source.width=320;source.height=180;const sourceContext=source.getContext('2d');sourceContext.fillStyle='#ff0000';sourceContext.fillRect(0,0,160,180);sourceContext.fillStyle='#0000ff';sourceContext.fillRect(160,0,160,180);const image=new Image();image.src=source.toDataURL();await image.decode();
  const doc=createDocument('transform','Transform',1);doc.appearance={background:'#000000',padding:0,radius:0,width:320,height:180};const s=doc.segments[0],output=document.createElement('canvas');const pixel=(x,y)=>[...output.getContext('2d').getImageData(x,y,1,1).data];
  s.crop={x:0,y:0,width:0.5,height:1};renderFrame(output,image,doc.appearance,s,doc,0);const cropped=pixel(160,90);
  delete s.crop;s.mirror=true;renderFrame(output,image,doc.appearance,s,doc,0);const mirrored=pixel(40,90);
  s.mirror=false;s.rotation=90;renderFrame(output,image,doc.appearance,s,doc,0);const rotatedTop=pixel(160,30),rotatedBottom=pixel(160,150);
  s.rotation=0;s.fadeIn=1;renderFrame(output,image,doc.appearance,s,doc,0.5);const faded=pixel(40,90);
  return {cropped,mirrored,rotatedTop,rotatedBottom,faded};
 });
 assert.ok(transformCheck.cropped[0]>240);assert.ok(transformCheck.mirrored[2]>240);assert.ok(transformCheck.rotatedTop[0]>240&&transformCheck.rotatedBottom[2]>240);assert.ok(Math.abs(transformCheck.faded[0]-128)<3);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle='#3366cc';ctx.fillRect(0,0,320,180);return c.toDataURL('image/png').split(',')[1]});
 await page.getByLabel('Open screenshot').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 const screenshot=page.locator('section').filter({has:page.getByRole('heading',{name:'Screenshot editor',exact:true})});
 await screenshot.getByRole('button',{name:'Save screenshot PNG',exact:true}).waitFor();
 await screenshot.getByRole('button',{name:'pixelate',exact:true}).click();
 const imageCheck=await screenshot.locator('canvas').evaluate(canvas=>{const color=[...canvas.getContext('2d').getImageData(160,90,1,1).data];return {color,png:canvas.toDataURL('image/png').startsWith('data:image/png'),jpeg:canvas.toDataURL('image/jpeg').startsWith('data:image/jpeg')};});
 assert.ok(imageCheck.color[2]>150);assert.ok(imageCheck.png&&imageCheck.jpeg);
 assert.deepEqual(errors,[]);console.log('PASS: video rendering/cancellation, package UI round-trip and duplication, crop/rotation/mirror/fade pixels, autosave, screenshot PNG/JPEG.');
}finally{await browser.close();await rm(fixtureDirectory,{recursive:true,force:true})}


