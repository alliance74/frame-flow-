import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecordingClock} from './recording-clock.ts';
test('recording duration excludes pauses and handles repeated controls',()=>{
  let time=0;const clock=new RecordingClock(()=>time);
  clock.start();time=1500;clock.pause();clock.pause();time=9000;
  assert.equal(clock.seconds(),1.5);clock.resume();clock.resume();time=10000;
  assert.equal(clock.seconds(),2.5);clock.pause();time=20000;assert.equal(clock.seconds(),2.5);
  clock.start();assert.equal(clock.seconds(),0);
});

