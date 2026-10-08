import {unpackProject,type ProjectPackage} from './project-package.ts';
import {recordingStore,type StoredRecording} from './recording-store.ts';
/** Remap the media identity so importing a package never overwrites an existing project. */
export async function importPackage(file:Blob):Promise<StoredRecording>{return storeProject(await unpackProject(file));}
export async function storeProject(project:ProjectPackage):Promise<StoredRecording>{
 const id=crypto.randomUUID();const document=structuredClone(project.document);document.mediaId=id;
 const recording:StoredRecording={id,name:document.name||project.name,blob:project.media,duration:project.duration,createdAt:new Date().toISOString(),editDocument:document};
 await recordingStore.save(recording);return recording;
}
