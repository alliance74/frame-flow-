/** Monotonic active recording time; paused intervals never enter media duration. */
export class RecordingClock {
  private elapsed = 0;
  private runningSince: number | null = null;
  private now: () => number;
  constructor(now: () => number = () => performance.now()) { this.now = now; }
  start() { this.elapsed = 0; this.runningSince = this.now(); }
  pause() { if (this.runningSince !== null) { this.elapsed += this.now() - this.runningSince; this.runningSince = null; } }
  resume() { if (this.runningSince === null) this.runningSince = this.now(); }
  seconds() { return (this.elapsed + (this.runningSince === null ? 0 : this.now() - this.runningSince)) / 1000; }
}
