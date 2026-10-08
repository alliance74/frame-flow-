import {validateDocument,type EditDocument} from './timeline.ts';
export type StoredRecording = {id:string; name:string; blob:Blob; duration:number; createdAt:string;editDocument?:EditDocument};
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('frameflow-local', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('recordings', {keyPath:'id'});
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined; }; resolve(request.result); };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Close other Frameflow windows to open local storage.')); };
  });
}
async function transaction<T>(mode: IDBTransactionMode, operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('recordings',mode);
    const request = operation(tx.objectStore('recordings'));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? request.error ?? new Error('Local storage transaction failed.'));
    tx.onerror = () => reject(tx.error ?? request.error);
  });
}
export const recordingStore = {
  async get(id:string):Promise<StoredRecording|undefined> {return transaction('readonly',s=>s.get(id));},
  async list() { return (await transaction('readonly',s=>s.getAll()) as StoredRecording[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); },
  async save(recording:StoredRecording) {
    if (!recording.id || !recording.name.trim() || !Number.isFinite(recording.duration) || recording.duration < 0 || !(recording.blob instanceof Blob) || !recording.blob.size) throw new Error('Invalid or empty recording.');
    if(recording.editDocument)validateDocument(recording.editDocument,recording.id,recording.duration);
    await transaction('readwrite',s=>s.put(recording));
  },
  async saveEdit(document:EditDocument) {
    const db=await database();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('recordings','readwrite'),store=tx.objectStore('recordings'),request=store.get(document.mediaId);
      let failure:unknown;
      request.onsuccess=()=>{const recording=request.result as StoredRecording|undefined;if(!recording)return;try{recording.editDocument=validateDocument(document,recording.id,recording.duration);store.put(recording)}catch(e){failure=e;tx.abort()}};
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure??tx.error??new Error('Edit save failed.'));tx.onerror=()=>reject(tx.error);
    });
  },
  async delete(id:string) { await transaction('readwrite',s=>s.delete(id)); }
};
