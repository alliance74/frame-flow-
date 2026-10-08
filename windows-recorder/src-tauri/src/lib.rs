mod projects;
#[cfg(windows)]
mod native_capture;
use tauri::Manager;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder=tauri::Builder::default();
    #[cfg(windows)]
    let builder=builder.manage(native_capture::CaptureState::default())
      .invoke_handler(tauri::generate_handler![projects::save_edit_document,projects::load_edit_document,native_capture::start_native_capture,native_capture::stop_native_capture,native_capture::list_native_recordings]);
    #[cfg(not(windows))]
    let builder=builder.invoke_handler(tauri::generate_handler![projects::save_edit_document,projects::load_edit_document]);
    builder
      .setup(|app| {
          let directory=app.path().app_data_dir()?;
          std::fs::create_dir_all(&directory)?;
          let store=projects::open(&directory.join("frameflow.sqlite")).map_err(std::io::Error::other)?;
          app.manage(store);Ok(())
      })
      .run(tauri::generate_context!()).expect("error while running Frameflow");
}
