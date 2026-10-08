import {convertFileSrc,invoke,isTauri} from '@tauri-apps/api/core';
import {useEffect,useState} from 'react';
import TimelineEditor from './TimelineEditor';
type NativeRecording={id:string;path:string;duration:number;createdAt:number};
export default function NativeRecorder(){
 const [items,setItems]=useState<NativeRecording[]>([]),[active,setActive]=useState<NativeRecording|null>(null),[running,setRunning]=useState(false),[busy,setBusy]=useState(false),[fps,setFps]=useState(30),[error,setError]=useState('');
 useEffect(()=>{if(isTauri())void invoke<NativeRecording[]>('list_native_recordings').then(setItems).catch(e=>setError(String(e)))},[]);
 if(!isTauri())return null;
 async function start(){setBusy(true);setError('');try{const id=await invoke<string|null>('start_native_capture',{fps});if(id)setRunning(true)}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function stop(cancel:boolean){setBusy(true);try{const item=await invoke<NativeRecording|null>('stop_native_capture',{cancel});if(item){setItems(old=>[item,...old]);setActive(item)}}catch(e){setError(String(e))}finally{setRunning(false);setBusy(false)}}
 return <section className="editStudio"><h3>Native Windows capture</h3><p>Windows screen/window picker → Direct3D capture → Media Foundation MP4. This initial native path records video and the original cursor. Native audio, pause/resume, and region capture remain pending validation and integration.</p><div className="editActions"><select aria-label="Native frame rate" disabled={running||busy} value={fps} onChange={e=>setFps(Number(e.target.value))}><option value="30">30 FPS</option><option value="60">60 FPS</option></select>{running?<><button disabled={busy} onClick={()=>void stop(false)}>Stop native recording</button><button disabled={busy} onClick={()=>void stop(true)}>Cancel native recording</button></>:<button disabled={busy} onClick={()=>void start()}>Record with Windows capture</button>}</div><div className="editSegments">{items.map(item=><button key={item.id} disabled={running||busy} onClick={()=>setActive(item)}>{new Date(item.createdAt*1000).toLocaleString()} · {item.duration.toFixed(1)}s</button>)}</div>{error&&<p role="alert">{error}</p>}{active&&!running&&<TimelineEditor key={active.id} mediaId={active.id} name={'Native '+active.id} url={convertFileSrc(active.path)} duration={active.duration}/>}</section>;
}
