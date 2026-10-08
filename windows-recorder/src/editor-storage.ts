import {validateDocument, type EditDocument} from './timeline';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {recordingStore} from './recording-store';
let pending:Promise<void>=Promise.resolve();