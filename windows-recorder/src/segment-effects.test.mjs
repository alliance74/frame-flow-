import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDocument,locate,split,validateDocument} from './timeline.ts';import {fadeEnvelope} from './segment-effects.ts';