import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDocument,validateDocument,split,locate,timelineDuration,EditHistory} from './timeline.ts';
test('split preserves source frames and scaled duration',()=>{
 const d=createDocument('media','Demo',12);d.segments[0].speed=2;
 const result=split(d.segments,d.segments[0].id,2,'second');
 assert.equal(timelineDuration(result),6);assert.equal(result[0].sourceOut,4);assert.equal(result[1].sourceIn,4);
 assert.equal(locate(result,2).segment.id,'second');assert.equal(locate(result,3).sourceTime,6);assert.equal(locate(result,6),null);
 assert.throws(()=>split(result,'second',4,'third'),/inside/);
});