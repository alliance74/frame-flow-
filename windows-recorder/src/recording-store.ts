import {validateDocument,type EditDocument} from './timeline.ts';
export type StoredRecording = {id:string; name:string; blob:Blob; duration:number; createdAt:string;editDocument?:EditDocument};