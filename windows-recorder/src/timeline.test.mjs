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
test('history restores edits without mutating earlier snapshots',()=>{
 const history=new EditHistory();const original=createDocument('m','A',10);history.record(original);
 const edited=structuredClone(original);edited.segments[0].sourceIn=3;
 const previous=history.undo(edited);assert.equal(previous.segments[0].sourceIn,0);
 assert.equal(history.redo(previous).segments[0].sourceIn,3);
 history.record(edited);assert.equal(history.canRedo,false);
});
test('document rejects corrupt media references, bounds and effects',()=>{
 const d=createDocument('m','Demo',10);assert.deepEqual(validateDocument(d,'m',10),d);
 assert.throws(()=>validateDocument(d,'other',10));
 for(const edit of [s=>s.sourceOut=11,s=>s.speed=0,s=>s.volume=2,s=>s.sourceIn=NaN]){const bad=structuredClone(d);edit(bad.segments[0]);assert.throws(()=>validateDocument(bad,'m',10));}
 const duplicate=structuredClone(d);duplicate.segments.push(duplicate.segments[0]);assert.throws(()=>validateDocument(duplicate,'m',10));
 d.appearance.background='url(secret)';assert.throws(()=>validateDocument(d,'m',10));
});
