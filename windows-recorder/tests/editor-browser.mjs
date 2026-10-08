import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';
// Use a deterministically encoded input: headless canvas MediaRecorder can defer all source frames.
const fixtureDirectory=await mkdtemp(join(tmpdir(),'frameflow-test-')),fixturePath=join(fixtureDirectory,'source.mp4');
const frames=[];for(let frame=0;frame<60;frame++){const rgb=Buffer.alloc(320*180*3);for(let y=0;y<180;y++)for(let x=0;x<320;x++){const i=(y*320+x)*3,white=y>=30&&y<60&&x>=frame*3&&x<frame*3+30;rgb[i]=white?255:0;rgb[i+1]=white?255:187;rgb[i+2]=white?255:85;}frames.push(rgb);}
await new Promise((resolve,reject)=>{const ffmpeg=spawn(process.env.FRAMEFLOW_FFMPEG??'ffmpeg',['-y','-f','rawvideo','-pix_fmt','rgb24','-s','320x180','-r','30','-i','pipe:0','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-strict','experimental','-b:a','128k','-movflags','+faststart',fixturePath],{windowsHide:true,stdio:['pipe','ignore','pipe']});let stderr='';ffmpeg.stderr.on('data',data=>stderr+=data);ffmpeg.on('error',reject);ffmpeg.on('close',code=>code===0?resolve():reject(new Error(stderr)));ffmpeg.stdin.on('error',reject);ffmpeg.stdin.end(Buffer.concat(frames));});
const fixtureBytes=await readFile(fixturePath);
const {chromium}=await import(process.env.FRAMEFLOW_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});