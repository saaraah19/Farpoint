import type { SoundStyle } from './types';

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      sharedCtx = new Ctx();
    }
    // Browsers suspend contexts created/left idle outside a user gesture window.
    if (sharedCtx.state === 'suspended') sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** A soft two-note chime. `rising` = work finished (higher, alert-ish); otherwise break finished (gentler). */
function playChime(rising: boolean) {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = rising ? [523.25, 659.25] : [659.25, 523.25]; // C5->E5 or E5->C5
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

/** A small synthesized "meow" — a pitch-swept sawtooth with a bit of vibrato and a formant-ish filter. */
function playMeow() {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const dur = 0.42;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';

  // Pitch contour: quick rise then a lazy fall, like "mrreow".
  osc.frequency.setValueAtTime(340, t0);
  osc.frequency.exponentialRampToValueAtTime(560, t0 + 0.09);
  osc.frequency.exponentialRampToValueAtTime(260, t0 + dur);

  // A little vibrato for character.
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 22;
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = 12;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  // Formant-ish bandpass so it doesn't sound like a raw buzz.
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 1.1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.11, t0 + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  vibrato.start(t0);
  osc.stop(t0 + dur + 0.05);
  vibrato.stop(t0 + dur + 0.05);
}

/**
 * Play the "phase finished" sound.
 * @param workJustEnded true if a focus block just ended (about to look away),
 *   false if a break just ended (about to focus again).
 */
export function playPhaseSound(style: SoundStyle, workJustEnded: boolean) {
  if (style === 'meow') playMeow();
  else playChime(workJustEnded);
}

/** A slightly brighter double-meow / chime used for "goal complete" celebrations. */
export function playCelebration(style: SoundStyle) {
  if (style === 'meow') {
    playMeow();
    setTimeout(() => playMeow(), 220);
  } else {
    playChime(false);
    setTimeout(() => playChime(true), 200);
  }
}

let purrNodes: { masterGain: GainNode; carrier: OscillatorNode; lfo: OscillatorNode } | null = null;

/**
 * Starts a very soft, low looping "purr" — an amplitude-modulated low
 * triangle wave through a lowpass filter. Ambient background texture for
 * focus sessions, synthesized (no audio file, nothing to license). Safe to
 * call repeatedly; it's a no-op if already running.
 */
export function startPurr() {
  if (purrNodes) return;
  const ctx = getCtx();
  if (!ctx) return;

  const carrier = ctx.createOscillator();
  carrier.type = 'triangle';
  carrier.frequency.value = 34;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.4; // purring "rumble" rate

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain);

  const ampGain = ctx.createGain();
  ampGain.gain.value = 0.5;
  lfoGain.connect(ampGain.gain);
  carrier.connect(ampGain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 140;
  ampGain.connect(filter);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.2); // gentle fade in
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  carrier.start();
  lfo.start();
  purrNodes = { masterGain, carrier, lfo };
}

/** Fades out and tears down the purr loop, if running. */
export function stopPurr() {
  if (!purrNodes) return;
  const ctx = getCtx();
  const { masterGain, carrier, lfo } = purrNodes;
  purrNodes = null;
  if (!ctx) return;
  const t = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(t);
  masterGain.gain.setValueAtTime(masterGain.gain.value, t);
  masterGain.gain.linearRampToValueAtTime(0.0001, t + 0.6);
  setTimeout(() => {
    try { carrier.stop(); lfo.stop(); } catch { /* already stopped */ }
  }, 700);
}
