# Frameflow Studio — Windows Recorder (Initial Working Build)

## Run
Install Node.js 20+ and Rust with the MSVC toolchain, plus Microsoft C++ Build Tools and WebView2 on Windows.

```powershell
npm install
npm run dev
```

For the native Windows shell:

```powershell
npm run tauri dev
```

For a Windows installer:

```powershell
npm run tauri build
```

## What works in this incremental build
- Screen/window selection via Chromium/WebView media capture permissions where supported
- WebM recording using MediaRecorder
- Optional microphone and system audio mixing (system audio support varies by Windows/WebView runtime)
- Start/pause/resume/stop
- Durable local recording library (IndexedDB), playback, video import/deletion, and original-media download
- Pause-aware recording duration
- Webcam preview overlay (not burned into exported recording)
- Preview background, corner radius and zoom
- Export JSON project metadata
- Non-destructive timeline editing, speed/volume/opacity, undo/redo and saved edit documents
- Manual camera keyframes and shared canvas annotations/redaction
- Edited WebM export with progress/cancellation; screenshot editor in Projects with PNG/JPEG output
- Portable `.frameflow` packages with integrity validation, import and duplication (one source asset, up to 512 MiB)
- Shared-renderer crop, quarter-turn rotation, mirroring, audio/video fades and freeze frames

Native WGC/Media Foundation capture and SQLite edit storage are connected to the desktop shell but remain unverified until Rust compilation and Windows runtime tests pass.

## Not implemented yet
Native audio/region/pause, automatic interaction zoom/cursor effects, multitrack editing, production native edited exports, full screenshot capture/history, multi-asset project packages and cloud collaboration. UI placeholders are marked PLANNED. **This scaffold is not the full first release.** See IMPLEMENTATION_STATUS.md for verification and remaining requirements.

## Architecture direction
Native recording must move into Rust/Windows.Graphics.Capture with WASAPI audio and cursor event capture; the browser-based capture is a temporary functional vertical slice. Use SQLite + local media files for durable projects, Direct3D composition for preview and rendering, FFmpeg/Media Foundation for export, then NestJS + PostgreSQL + object storage for cloud collaboration. Never depend on browser MediaRecorder for production-quality Windows capture.


