import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';
// Use a deterministically encoded input: headless canvas MediaRecorder can defer all source frames.
const fixtureDirectory=await mkdtemp(join(tmpdir(),'frameflow-test-')),fixturePath=join(fixtureDirectory,'source.mp4');
const frames=[];for(let frame=0;frame<60;frame++){const rgb=Buffer.alloc(320*180*3);for(let y=0;y<180;y++)for(let x=0;x<320;x++){const i=(y*320+x)*3,white=y>=30&&y<60&&x>=frame*3&&x<frame*3+30;rgb[i]=white?255:0;rgb[i+1]=white?255:187;rgb[i+2]=white?255:85;}frames.push(rgb);}