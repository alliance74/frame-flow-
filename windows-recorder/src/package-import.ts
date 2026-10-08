import {unpackProject,type ProjectPackage} from './project-package.ts';
import {recordingStore,type StoredRecording} from './recording-store.ts';
/** Remap the media identity so importing a package never overwrites an existing project. */
export async function importPackage(file:Blob):Promise<StoredRecording>{return storeProject(await unpackProject(file));}