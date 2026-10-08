import {test} from 'node:test';import assert from 'node:assert/strict';
import {packProject,unpackProject} from './project-package.ts';import {createDocument} from './timeline.ts';
import 'fake-indexeddb/auto';import {importPackage} from './package-import.ts';import {recordingStore} from './recording-store.ts';
test('portable package preserves original bytes and every edit',async()=>{
 const d=createDocument('media','Edited demo',20);d.segments[0].sourceIn=4;d.segments[0].speed=2;d.camera=[{time:0,x:0.5,y:0.5,zoom:2,easing:'smooth'}];
 const media=new Blob([new Uint8Array([0,255,0,99,42])],{type:'video/webm;codecs=vp8'});
 const result=await unpackProject(await packProject(d,media,'demo.webm',20));assert.deepEqual(result.document,d);assert.deepEqual(await result.media.arrayBuffer(),await media.arrayBuffer());assert.equal(result.media.type,media.type);assert.equal(result.duration,20);
});
test('repeated imports remap identity and commit media and edits together',async()=>{
 const doc=createDocument('original','Project',10);doc.segments[0].sourceIn=2;const pack=await packProject(doc,new Blob(['bytes'],{type:'video/mp4'}),'a.mp4',10);
 const first=await importPackage(pack),second=await importPackage(pack);assert.notEqual(first.id,second.id);assert.notEqual(first.id,'original');
 assert.equal((await recordingStore.get(first.id)).editDocument.mediaId,first.id);
 const changed=structuredClone(first.editDocument);changed.name='Changed';await recordingStore.saveEdit(changed);assert.equal((await recordingStore.get(first.id)).editDocument.name,'Changed');assert.equal(await (await recordingStore.get(first.id)).blob.text(),'bytes');
 await recordingStore.delete(first.id);assert.equal(await recordingStore.get(first.id),undefined);await recordingStore.delete(second.id);
});