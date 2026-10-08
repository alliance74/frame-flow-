# frame-flow-

Frameflow Studio for Windows: screen recording, non-destructive editing and local project workflows.

## Run

```powershell
cd windows-recorder
npm install
npm run dev
```

## Verify

```powershell
npm test
npm run build
# With the dev server, Edge, Playwright and FFmpeg available:
npm run test:browser
```

Native shell and installer builds require Rust MSVC, C++ Build Tools, the Windows SDK and WebView2.

See [implementation status](windows-recorder/IMPLEMENTATION_STATUS.md) for tested features, native build blockers and remaining requirements. The full master specification is not yet complete.

The initial 100-commit import is reconstructed from the existing uncommitted implementation. Validation applies to the final source snapshot.
