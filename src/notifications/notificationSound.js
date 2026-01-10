// Minimal, dependency-free notification sound.
// Uses WebAudio to generate a short "pop" sound.
// Note: browsers may block audio until user interacts with the page.

let audioCtx = null;
let primed = false;

function getCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

// Call once after the first user gesture (pointerdown/click) to "unlock" audio.
export function primeNotificationSound() {
  if (primed) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    // Play an inaudible tick to unlock on iOS/Safari
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    primed = true;
  } catch {
    // ignore
  }
}

export async function playNotificationSound() {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const t0 = ctx.currentTime;

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    // A soft "pop" (two quick tones with decay)
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.setValueAtTime(880, t0);
    o2.frequency.setValueAtTime(1320, t0);

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2600, t0);
    lp.Q.setValueAtTime(0.7, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);

    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + 0.40);
    o2.stop(t0 + 0.34);

    primed = true;
  } catch {
    // ignore (autoplay restriction etc.)
  }
}
