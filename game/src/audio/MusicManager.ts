// Tiny procedural background loop (no audio files): a 4-note bass line played on a timer.
const BASSLINE_HZ = [130.81, 130.81, 164.81, 146.83];
const STEP_MS = 500;

let context: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let bossTimer: ReturnType<typeof setInterval> | null = null;
let musicMuted = false;
let step = 0;
let bossStep = 0;

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
  if (musicMuted) return;
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

function playBossStep(): void {
  if (musicMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const startTime = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const frequencies = [55, 51.91, 58.27, 46.25];

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(frequencies[bossStep % frequencies.length], startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.035, startTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.5);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 1.6);

  bossStep += 1;
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

export function startBossMusic(): void {
  if (bossTimer) return;
  playBossStep();
  bossTimer = setInterval(playBossStep, 1600);
}

export function stopBossMusic(): void {
  if (bossTimer) {
    clearInterval(bossTimer);
    bossTimer = null;
  }
}

export function toggleMusic(): boolean {
  musicMuted = !musicMuted;
  return musicMuted;
}

export function isMusicMuted(): boolean {
  return musicMuted;
}
