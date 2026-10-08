import type {EditDocument,Annotation} from './timeline';
type Props={document:EditDocument;time:number;duration:number;commit:(document:EditDocument)=>void};