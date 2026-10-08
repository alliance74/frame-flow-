use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{path::Path, sync::Mutex};

pub struct ProjectStore(pub Mutex<Connection>);

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Segment {
    id: String, source_in: f64, source_out: f64, speed: f64, volume: f64, opacity: f64,
    #[serde(default,skip_serializing_if="Option::is_none")] crop:Option<Crop>,
    #[serde(default,skip_serializing_if="Option::is_none")] rotation:Option<u16>,
    #[serde(default,skip_serializing_if="Option::is_none")] mirror:Option<bool>,
    #[serde(default,skip_serializing_if="Option::is_none")] fade_in:Option<f64>,
    #[serde(default,skip_serializing_if="Option::is_none")] fade_out:Option<f64>,
    #[serde(default,skip_serializing_if="Option::is_none")] freeze:Option<f64>,
    #[serde(default,skip_serializing_if="Option::is_none")] effect_range:Option<EffectRange>,
}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Crop {x:f64,y:f64,width:f64,height:f64}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EffectRange {offset:f64,duration:f64}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Appearance { background: String, padding: f64, radius: f64, width: u32, height: u32 }
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EditDocument { version: u32, media_id: String, name: String, segments: Vec<Segment>, appearance: Appearance, #[serde(default,skip_serializing_if="Option::is_none")] annotations:Option<Vec<serde_json::Value>>, #[serde(default,skip_serializing_if="Option::is_none")] camera:Option<Vec<serde_json::Value>> }

fn valid_id(id: &str) -> bool { !id.is_empty() && id.len() <= 128 && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_') }
fn validate(d: &EditDocument) -> Result<(), String> {
    if d.version != 1 || !valid_id(&d.media_id) || d.name.len() > 1024 || d.segments.len() > 10000 { return Err("Invalid project metadata".into()); }
    let mut ids = std::collections::HashSet::new();
    for s in &d.segments {
        if !valid_id(&s.id) || !ids.insert(&s.id) || ![s.source_in,s.source_out,s.speed,s.volume,s.opacity].iter().all(|v| v.is_finite()) || s.source_in < 0.0 || s.source_out <= s.source_in || !(0.25..=4.0).contains(&s.speed) || !(0.0..=1.0).contains(&s.volume) || !(0.0..=1.0).contains(&s.opacity) { return Err("Invalid timeline clip".into()); }
        let duration=(s.source_out-s.source_in)/s.speed;
        if let Some(c)=&s.crop {if ![c.x,c.y,c.width,c.height].iter().all(|v|v.is_finite())||c.x<0.0||c.y<0.0||c.width<=0.0||c.height<=0.0||c.x+c.width>1.000001||c.y+c.height>1.000001{return Err("Invalid crop".into());}}
        if s.rotation.is_some_and(|r|![0,90,180,270].contains(&r)) {return Err("Invalid rotation".into());}
        let effect_duration=if let Some(range)=&s.effect_range {if !range.offset.is_finite()||!range.duration.is_finite()||range.offset<0.0||range.duration<=0.0||range.offset+duration>range.duration+0.000001{return Err("Invalid fade timing".into());}range.duration}else{duration};
        if [s.fade_in,s.fade_out].iter().flatten().any(|v|!v.is_finite()||*v<0.0||*v>effect_duration)||s.freeze.is_some_and(|v|!v.is_finite()||v<0.0){return Err("Invalid fade or freeze frame".into());}
    }
    let a=&d.appearance;
    if a.background.len()!=7 || !a.background.starts_with('#') || !a.background[1..].bytes().all(|b| b.is_ascii_hexdigit()) || !a.padding.is_finite() || !(0.0..=0.3).contains(&a.padding) || !a.radius.is_finite() || !(0.0..=200.0).contains(&a.radius) || !(128..=3840).contains(&a.width) || !(128..=3840).contains(&a.height) { return Err("Invalid appearance".into()); }
    if d.annotations.as_ref().is_some_and(|a|a.len()>1000) || d.camera.as_ref().is_some_and(|c|c.len()>10000) { return Err("Too many effects".into()); }
    Ok(())
}
pub fn open(path: &Path) -> Result<ProjectStore, String> {
    let db=Connection::open(path).map_err(|e|e.to_string())?;
    db.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e|e.to_string())?;
    migrate(&db)?; Ok(ProjectStore(Mutex::new(db)))
}
fn migrate(db:&Connection)->Result<(),String> {
    let version:i32=db.query_row("PRAGMA user_version",[],|row|row.get(0)).map_err(|e|e.to_string())?;
    if version>1{return Err("Project database requires a newer Frameflow version".into());}
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS local_projects(media_id TEXT PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL CHECK(version=1), document TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')));
      CREATE TABLE IF NOT EXISTS project_recovery(media_id TEXT PRIMARY KEY REFERENCES local_projects(media_id) ON DELETE CASCADE, document TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS projects_recent ON local_projects(updated_at DESC);
      PRAGMA user_version=1;").map_err(|e|e.to_string())
}
fn save(db:&mut Connection,d:&EditDocument)->Result<(),String> {
    validate(d)?;let json=serde_json::to_string(d).map_err(|e|e.to_string())?;
    let tx=db.transaction().map_err(|e|e.to_string())?;
    tx.execute("INSERT INTO project_recovery(media_id,document) SELECT media_id,document FROM local_projects WHERE media_id=?1 ON CONFLICT(media_id) DO UPDATE SET document=excluded.document",[&d.media_id]).map_err(|e|e.to_string())?;
    tx.execute("INSERT INTO local_projects(media_id,name,version,document) VALUES(?1,?2,1,?3) ON CONFLICT(media_id) DO UPDATE SET name=excluded.name,document=excluded.document,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",params![d.media_id,d.name,json]).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e|e.to_string())
}
#[tauri::command]
pub fn save_edit_document(store:tauri::State<'_,ProjectStore>,document:EditDocument)->Result<(),String> {
    let mut db=store.0.lock().map_err(|_|"Project database lock failed")?;save(&mut db,&document)
}
#[tauri::command]
pub fn load_edit_document(store:tauri::State<'_,ProjectStore>,media_id:String,recovery:bool)->Result<Option<EditDocument>,String> {
    if !valid_id(&media_id) { return Err("Invalid media ID".into()); }
    let db=store.0.lock().map_err(|_|"Project database lock failed")?;
    let sql=if recovery { "SELECT document FROM project_recovery WHERE media_id=?1" } else { "SELECT document FROM local_projects WHERE media_id=?1" };
    let json:Option<String>=db.query_row(sql,[media_id],|row|row.get(0)).optional().map_err(|e|e.to_string())?;
    json.map(|text|{let d:EditDocument=serde_json::from_str(&text).map_err(|e|e.to_string())?;validate(&d)?;Ok(d)}).transpose()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn document()->EditDocument { EditDocument{version:1,media_id:"media-1".into(),name:"Demo".into(),segments:vec![Segment{id:"clip-1".into(),source_in:0.0,source_out:10.0,speed:1.0,volume:1.0,opacity:1.0,crop:None,rotation:None,mirror:None,fade_in:None,fade_out:None,freeze:None,effect_range:None}],appearance:Appearance{background:"#123456".into(),padding:0.06,radius:18.0,width:1280,height:720},annotations:None,camera:None} }
    #[test] fn project_save_keeps_previous_recovery_document() {
        let mut db=Connection::open_in_memory().unwrap();migrate(&db).unwrap();let mut d=document();save(&mut db,&d).unwrap();d.name="Updated".into();save(&mut db,&d).unwrap();
        let old:String=db.query_row("SELECT document FROM project_recovery",[],|r|r.get(0)).unwrap();assert!(old.contains("Demo"));
        let name:String=db.query_row("SELECT name FROM local_projects",[],|r|r.get(0)).unwrap();assert_eq!(name,"Updated");
    }
    #[test] fn rejects_unsafe_ids_and_invalid_clip_bounds() { let mut d=document();d.media_id="../escape".into();assert!(validate(&d).is_err());d.media_id="ok".into();d.segments[0].source_out=-1.0;assert!(validate(&d).is_err()); }
}

