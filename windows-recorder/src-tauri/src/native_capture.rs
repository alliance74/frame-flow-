//! WGC/Direct3D capture and Media Foundation MP4 encoding. Audio integration is pending.
use serde::{Deserialize,Serialize};
use std::{path::PathBuf,sync::Mutex,time::Instant};
use tauri::Manager;
use windows_capture::{capture::{CaptureControl,Context,GraphicsCaptureApiHandler},encoder::{AudioSettingsBuilder,ContainerSettingsBuilder,VideoEncoder,VideoSettingsBuilder},frame::Frame,graphics_capture_api::InternalCaptureControl,graphics_capture_picker::GraphicsCapturePicker,settings::{ColorFormat,CursorCaptureSettings,DirtyRegionSettings,DrawBorderSettings,MinimumUpdateIntervalSettings,SecondaryWindowSettings,Settings}};
type CaptureError=Box<dyn std::error::Error+Send+Sync>;
pub struct Handler { encoder:Option<VideoEncoder>,width:u32,height:u32 }
impl GraphicsCaptureApiHandler for Handler {
 type Flags=(PathBuf,u32,u32,u32);
 type Error=CaptureError;
 fn new(ctx:Context<Self::Flags>)->Result<Self,Self::Error>{
  let (path,width,height,fps)=ctx.flags;
  let encoder=VideoEncoder::new(VideoSettingsBuilder::new(width,height).frame_rate(fps),AudioSettingsBuilder::new().disabled(true),ContainerSettingsBuilder::new(),path)?;
  Ok(Self{encoder:Some(encoder),width,height})
 }
 fn on_frame_arrived(&mut self,frame:&mut Frame,control:InternalCaptureControl)->Result<(),Self::Error>{
  if frame.width()!=self.width||frame.height()!=self.height {control.stop();return Err(std::io::Error::other("Capture dimensions changed; restart recording for the new size.").into());}
  if let Some(encoder)=self.encoder.as_mut(){encoder.send_frame(frame)?;}Ok(())
 }
 fn on_closed(&mut self)->Result<(),Self::Error>{self.finish()}
}
impl Handler { fn finish(&mut self)->Result<(),CaptureError>{if let Some(encoder)=self.encoder.take(){encoder.finish()?;}Ok(())} }
struct Session {control:CaptureControl<Handler,CaptureError>,id:String,path:PathBuf,start:Instant}
pub struct CaptureState(Mutex<Option<Session>>);
impl Default for CaptureState {fn default()->Self{Self(Mutex::new(None))}}
impl Drop for CaptureState {
 fn drop(&mut self){if let Ok(slot)=self.0.get_mut(){if let Some(session)=slot.take(){let callback=session.control.callback();let _=session.control.stop();if let Ok(mut handler)=callback.lock(){let _=handler.finish();};}}}
}
#[derive(Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct NativeRecording {id:String,path:String,duration:f64,created_at:u64}
fn directory(app:&tauri::AppHandle)->Result<PathBuf,String>{let path=app.path().app_data_dir().map_err(|e|e.to_string())?.join("recordings");std::fs::create_dir_all(&path).map_err(|e|e.to_string())?;Ok(path)}
#[tauri::command]
pub fn start_native_capture(app:tauri::AppHandle,state:tauri::State<'_,CaptureState>,fps:u32)->Result<Option<String>,String>{
 if ![30,60].contains(&fps){return Err("Choose 30 or 60 FPS".into());}
 let mut slot=state.0.lock().map_err(|_|"Capture state lock failed")?;
 if slot.is_some(){return Err("A native recording is already active".into());}
 let item=GraphicsCapturePicker::pick_item().map_err(|e|e.to_string())?;
 let Some(item)=item else{return Ok(None)};
 let (width,height)=item.size().map_err(|e|e.to_string())?;
 if width<=0||height<=0||width>7680||height>4320||width%2!=0||height%2!=0{return Err("Choose an even-sized display/window up to 7680×4320".into());}
 let id=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos().to_string();
 let path=directory(&app)?.join(format!("{id}.mp4"));
 let settings=Settings::new(item,CursorCaptureSettings::Default,DrawBorderSettings::Default,SecondaryWindowSettings::Default,MinimumUpdateIntervalSettings::Default,DirtyRegionSettings::Default,ColorFormat::Rgba8,(path.clone(),width as u32,height as u32,fps));
 let control=match Handler::start_free_threaded(settings){Ok(control)=>control,Err(e)=>{let _=std::fs::remove_file(&path);return Err(e.to_string())}};
 *slot=Some(Session{control,id:id.clone(),path,start:Instant::now()});Ok(Some(id))
}
#[tauri::command]
pub fn stop_native_capture(app:tauri::AppHandle,state:tauri::State<'_,CaptureState>,cancel:bool)->Result<Option<NativeRecording>,String>{
 let session=state.0.lock().map_err(|_|"Capture state lock failed")?.take().ok_or("No native recording is active")?;
 let duration=session.start.elapsed().as_secs_f64();let callback=session.control.callback();
 let stopped=session.control.stop().map_err(|e|e.to_string());
 let finalized=callback.lock().map_err(|_|"Capture handler lock failed".to_string()).and_then(|mut handler|handler.finish().map_err(|e|e.to_string()));
 if cancel{let _=std::fs::remove_file(&session.path);return Ok(None)}
 stopped?;finalized?;
 let created_at=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_secs();
 let result=NativeRecording{id:session.id.clone(),path:session.path.to_string_lossy().into_owned(),duration,created_at};
 let json=serde_json::to_vec(&result).map_err(|e|e.to_string())?;
 let dir=directory(&app)?;let temporary=dir.join(format!("{}.json.tmp",session.id));std::fs::write(&temporary,json).map_err(|e|e.to_string())?;std::fs::rename(temporary,dir.join(format!("{}.json",session.id))).map_err(|e|e.to_string())?;Ok(Some(result))
}
#[tauri::command]
pub fn list_native_recordings(app:tauri::AppHandle)->Result<Vec<NativeRecording>,String>{
 let dir=directory(&app)?;let mut results=Vec::new();
 for entry in std::fs::read_dir(&dir).map_err(|e|e.to_string())?{let path=entry.map_err(|e|e.to_string())?.path();if path.extension().and_then(|s|s.to_str())!=Some("json"){continue}
  let bytes=std::fs::read(&path).map_err(|e|e.to_string())?;let mut item:NativeRecording=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
  if !item.id.bytes().all(|b|b.is_ascii_digit())||item.id.is_empty(){continue}
  let media=dir.join(format!("{}.mp4",item.id));if media.is_file(){item.path=media.to_string_lossy().into_owned();results.push(item)}
 }
 results.sort_by(|a,b|b.created_at.cmp(&a.created_at));Ok(results)
}
