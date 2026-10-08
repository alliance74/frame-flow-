import {test} from 'node:test';import assert from 'node:assert/strict';
import {sampleCamera} from './camera.ts';
import {createDocument,validateDocument} from './timeline.ts';
test('camera interpolation is deterministic and keeps crop inside content',()=>{
 const frames=[{time:0,x:0.5,y:0.5,zoom:1,easing:'smooth'},{time:2,x:1,y:0,zoom:3,easing:'smooth'}];
 assert.deepEqual(sampleCamera(frames,1),{zoom:2,x:0.75,y:0.25});
 const end=sampleCamera(frames,10);assert.equal(end.x,1-1/6);assert.equal(end.y,1/6);
 assert.deepEqual(sampleCamera(frames,1),sampleCamera([...frames].reverse(),1));
 assert.deepEqual(sampleCamera([],5),{x:0.5,y:0.5,zoom:1});
});