export type CameraKeyframe={time:number;x:number;y:number;zoom:number;easing:'linear'|'smooth'};
export function sampleCamera(frames:CameraKeyframe[],time:number){
 const neutral={x:0.5,y:0.5,zoom:1};if(!frames.length)return neutral;
 const sorted=[...frames].sort((a,b)=>a.time-b.time);let left=sorted[0],right=left;
 for(const frame of sorted){if(frame.time<=time)left=frame;else{right=frame;break;}right=left;}
 const t=left===right?0:Math.max(0,Math.min(1,(time-left.time)/(right.time-left.time)));
 const eased=right.easing==='smooth'?t*t*(3-2*t):t;
 const zoom=left.zoom+(right.zoom-left.zoom)*eased;
 const limit=0.5/zoom;
 return {zoom,x:Math.max(limit,Math.min(1-limit,left.x+(right.x-left.x)*eased)),y:Math.max(limit,Math.min(1-limit,left.y+(right.y-left.y)*eased))};
}
