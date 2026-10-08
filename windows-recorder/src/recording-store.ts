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