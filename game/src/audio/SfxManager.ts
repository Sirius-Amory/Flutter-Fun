export type SfxName = 'jump' | 'collect' | 'stomp' | 'hit' | 'levelComplete' | 'gameOver';

interface Tone {
  freq: number;
  duration: number;
  type?: OscillatorType;
  delay?: number;
}

const PATTERNS: Record<SfxName, Tone[]> = {
  jump: [{ freq: 500, duration: 0.08, type: 'square' }],
  collect: [
    { freq: 880, duration: 0.06, type: 'square' },
    { freq: 1320, duration: 0.08, type: 'square', delay: 0.06 },
  ],
  stomp: [{ freq: 180, duration: 0.1, type: 'square' }],
  hit: [{ freq: 140, duration: 0.18, type: 'sawtooth' }],
  levelComplete: [
    { freq: 523, duration: 0.1 },
    { freq: 659, duration: 0.1, delay: 0.1 },
    { freq: 784, duration: 0.2, delay: 0.2 },
  ],
  gameOver: [
    { freq: 392, duration: 0.15 },
    { freq: 330, duration: 0.15, delay: 0.15 },
    { freq: 261, duration: 0.3, delay: 0.3 },
  ],
};

let sharedContext: AudioContext | null = null;

// Every effect is a synthesized blip (Web Audio oscillators) - no audio files to fetch or license.
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext = new Ctor();
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume();
  }
  return sharedContext;
}

export function playSfx(name: SfxName): void {
  const ctx = getContext();
  if (!ctx) return;

  for (const tone of PATTERNS[name]) {
    const startTime = ctx.currentTime + (tone.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = tone.type ?? 'square';
    oscillator.frequency.setValueAtTime(tone.freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + tone.duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + tone.duration + 0.02);
  }
}
