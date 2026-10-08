import {validateDocument, type EditDocument} from './timeline';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {recordingStore} from './recording-store';
let pending:Promise<void>=Promise.resolve();
export async function loadEdit(mediaId:string,duration:number,recovery=false):Promise<EditDocument|null> {
  if(isTauri()) {
    const saved=await invoke<EditDocument|null>('load_edit_document',{mediaId,recovery});
    if(saved)return validateDocument(saved,mediaId,duration);
  }
  if(recovery)return null;
  const recording=await recordingStore.get(mediaId);
  if(recording?.editDocument)return validateDocument(recording.editDocument,mediaId,duration);
  const json=localStorage.getItem('frameflow-edit-'+mediaId);
  return json===null?null:validateDocument(JSON.parse(json),mediaId,duration);
}
export async function saveEdit(document:EditDocument) {
  await recordingStore.saveEdit(document);
  localStorage.setItem('frameflow-edit-'+document.mediaId,JSON.stringify(document));
  if(isTauri()){const snapshot=structuredClone(document);pending=pending.catch(()=>{}).then(()=>invoke<void>('save_edit_document',{document:snapshot}));await pending;}
}

