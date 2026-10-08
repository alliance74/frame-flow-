import {segmentDuration,type Segment} from './timeline';
type Props={segment:Segment;mediaDuration:number;sourceTime:number;commit:(segment:Segment)=>void;still?:boolean};