# Frameflow Studio implementation status

Updated 2026-10-08. This is an incremental implementation, **not the complete master specification release**.

## Implemented and verified
- Durable IndexedDB recording library: reload recovery, import, deletion, original downloads, storage errors and URL cleanup.
- Pause-aware monotonic clock and guarded browser capture startup.
- Non-destructive single-media timeline: trim, split, drag reorder, duplicate, ripple delete, speed, volume/mute, opacity, frame-step seeking, bounded undo/redo. Browser autosave, naming and edit-document import/export.
- Portable `.frameflow` packages include original media and edits with SHA-256 media integrity checks. Validated import assigns a fresh identity; duplication preserves edits. Media and documents commit together in IndexedDB. Current package limit: one source asset, 512 MiB.
- Crop, quarter-turn rotation, mirroring, audio/video fades and freeze frames use the shared renderer. Splits preserve fade timing and the frozen source frame. Frozen export mutes audio.
- Deterministic manual camera keyframes with smooth/linear easing and content-boundary clamping.
- Shared canvas preview/export: padding, solid backgrounds, corners, aspect ratios, camera transforms, timed text/rectangle/circle/arrow/line/highlight/blur/pixelation.
- Real-time edited WebM export includes source edits, speed, audio/volume and composition, progress and cancellation. This is a fallback, not the required native Direct3D/FFmpeg production renderer.
- Export waits for a presented source frame, pauses encoding during clip-boundary seeks, and rejects empty or undrawable output rather than reporting success.
- PNG/JPEG frame output and separate screenshot editor under Projects: import PNG/JPEG/WebP, resize/style/annotate/redact and encode PNG/JPEG. Clipboard action is wired but manually unverified.
- Offline fonts, restricted desktop CSP and app-owned native media scope. Native security behavior needs shell validation.

## Native implementation, unverified
- Rust WGC screen/window picker, Direct3D capture, Media Foundation MP4 encoding via windows-capture 2.0.1. Encoder 30/60 FPS configuration, start/stop/cancel, geometry-change errors, files/history/UI. Video-only; native pause/audio/region/constant-rate scheduling are missing.
- SQLite edit documents/migration/index, transactional saves and previous revision recovery, ID/payload validation. Desktop inspector invokes these commands; browser uses localStorage. Not the complete project/media schema.
- Rust database revision and validation tests added, not run.
- API reference: https://docs.rs/windows-capture/2.0.1/windows_capture/

## Verification
- npm test: **12 passed** (persistence, packages/corruption/identity isolation, timing, splits/time mapping, fade/freeze bounds, undo/redo, invalid documents/effects, camera boundaries).
- npm run build: **passed**, including TypeScript and Vite.
- Edge integration: **passed** exported source/background/annotation pixels, source audio (RMS 0.085), frozen-frame consistency and muted freeze audio, package UI download/import/duplication, crop/rotation/mirror/fade pixels, autosave, screenshot PNG/JPEG and cancellation. Fixture is FFmpeg-encoded moving video with a tone; physical capture remains unverified.
- npm run tauri build: damaged CLI native binding; replacement download failed EIDLETIMEOUT. Rust/cargo absent from PATH. No native capture, SQLite runtime or installer success claimed.
- CLI repair retried: downloads failed with connection resets/timeouts and the Windows binding remains missing. Installed FFmpeg is from 2013: sufficient for this basic test fixture, not a production encoding dependency.
- Clipboard permissions, device audio, native capture/CSP and installer need Windows validation.

## Remaining
- WASAPI/device recovery, native pause/region/DPI/multimonitor capture, webcam compositing, cursor/click/scroll events, countdown/shortcuts/tray.
- Automatic interaction zoom/cursor effects; shared Direct3D decoder/compositor, hardware/software fallback, edited MP4/MOV/GIF and production export options/presets.
- Multitrack editing/audio waveforms/snapping; arbitrary-angle rotation, transitions/PiP/layer ordering, gradient/image backgrounds, shadows/frames/mockups and full animation controls.
- Full project library/settings/save-as/delete/thumbnails/missing media and crash recovery; multi-asset packages and large-file streaming. Current edit documents reference one media asset.
- Native/delayed/scrolling screenshots, history and full crop/gradient/shadow workflows.
- Monorepo/Zustand/Tailwind/shadcn; NestJS/PostgreSQL/Prisma/Redis/BullMQ/Next.js/S3, authentication, resumable sharing/uploads, workspaces/review/comments/notifications/WebSockets.
- Complete command authorization/credentials/exclusions, signed updates/crash logging/icons and installer/release validation.

## Validation commands (from windows-recorder)
```powershell
npm install
npm test
npm run build
# Start server in one terminal:
npm run dev -- --host 127.0.0.1
# With Playwright, Edge and FFmpeg installed, in another terminal:
npm run test:browser
# With Rust MSVC and Windows SDK/C++ build tools:
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```
Node 22.18+ required for tests; Node 24 used. Browser test accepts FRAMEFLOW_PLAYWRIGHT_MODULE for an installed Playwright entrypoint and FRAMEFLOW_FFMPEG for the fixture encoder executable. NSIS/MSI configured; no installer generated.
