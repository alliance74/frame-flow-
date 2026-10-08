import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDocument,locate,split,validateDocument} from './timeline.ts';import {fadeEnvelope} from './segment-effects.ts';
test('fades use edited time and freeze frames use a fixed source timestamp',()=>{
 const doc=createDocument('m','Demo',10),s=doc.segments[0];s.speed=2;s.fadeIn=1;s.fadeOut=2;s.freeze=4;
 assert.equal(fadeEnvelope(s,0),0);assert.equal(fadeEnvelope(s,0.5),0.5);assert.equal(fadeEnvelope(s,2),1);assert.equal(fadeEnvelope(s,4),0.5);assert.equal(fadeEnvelope(s,5),0);
 assert.equal(locate(doc.segments,0.5).sourceTime,4);assert.equal(locate(doc.segments,4.5).sourceTime,4);
 const parts=split(doc.segments,s.id,2,'right');assert.doesNotThrow(()=>validateDocument({...doc,segments:parts},'m',10));
 assert.equal(parts[0].freeze,4);assert.equal(parts[1].freeze,4);assert.equal(fadeEnvelope(parts[0],1.5),fadeEnvelope(s,1.5));assert.equal(fadeEnvelope(parts[1],2),fadeEnvelope(s,4));
});
test('crop, rotation, fade and freeze bounds are validated',()=>{
 const doc=createDocument('m','Demo',10);doc.segments[0].crop={x:0.2,y:0.1,width:0.5,height:0.5};doc.segments[0].rotation=90;assert.doesNotThrow(()=>validateDocument(doc,'m',10));
 for(const mutate of [s=>s.crop.width=1,s=>s.rotation=45,s=>s.fadeIn=11,s=>s.freeze=10,s=>s.mirror='yes']){const bad=structuredClone(doc);mutate(bad.segments[0]);assert.throws(()=>validateDocument(bad,'m',10));}
});
