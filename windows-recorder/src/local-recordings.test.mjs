import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

import {recordingStore} from './recording-store.ts';

test('recording media survives storage reload, replacement, and deletion',async()=>{
  const recording={id:'test',name:'Demo',blob:new Blob(['real-media-bytes'],{type:'video/webm'}),duration:2.5,createdAt:'2026-10-08T10:00:00.000Z'};
  await recordingStore.save(recording);
  let rows=await recordingStore.list();assert.equal(rows.length,1);
  assert.equal(await rows[0].blob.text(),'real-media-bytes');assert.equal(rows[0].duration,2.5);
  await recordingStore.save({...recording,name:'Renamed'});
  rows=await recordingStore.list();assert.equal(rows.length,1);assert.equal(rows[0].name,'Renamed');
  await assert.rejects(recordingStore.save({...recording,blob:new Blob([])}),/Invalid/);
  await assert.rejects(recordingStore.save({...recording,duration:NaN}),/Invalid/);
  await recordingStore.delete(recording.id);assert.deepEqual(await recordingStore.list(),[]);
});

