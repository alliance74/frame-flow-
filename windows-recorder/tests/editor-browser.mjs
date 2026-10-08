import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';
// Use a deterministically encoded input: headless canvas MediaRecorder can defer all source frames.
const fixtureDirectory=await mkdtemp(join(tmpdir(),'frameflow-test-')),fixturePath=join(fixtureDirectory,'source.mp4');
const frames=[];