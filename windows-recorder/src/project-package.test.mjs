import {test} from 'node:test';import assert from 'node:assert/strict';
import {packProject,unpackProject} from './project-package.ts';import {createDocument} from './timeline.ts';
import 'fake-indexeddb/auto';import {importPackage} from './package-import.ts';import {recordingStore} from './recording-store.ts';