// Tiny procedural background loop (no audio files): a 4-note bass line played on a timer.
const BASSLINE_HZ = [130.81, 130.81, 164.81, 146.83];
const STEP_MS = 500;

let context: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let enabled = true;
let step = 0;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') {
    void context.resume();
  }
  return context;
}

function playStep(): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  const freq = BASSLINE_HZ[step % BASSLINE_HZ.length];
  const startTime = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.05, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.45);

  step += 1;
}

export function startBackgroundMusic(): void {
  if (timer) return;
  playStep();
  timer = setInterval(playStep, STEP_MS);
}

export function stopBackgroundMusic(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function toggleMusic(): boolean {
  enabled = !enabled;
  return enabled;
}
