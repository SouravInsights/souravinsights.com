/**
 * Sound profiles.
 *
 * Each profile is a small Web Audio graph scheduled at a precise `t` — no audio
 * files to download, decode, or preload.
 *
 * The vocabulary is deliberately tiny and weighted, because a sound should
 * carry the importance of the action it marks:
 *
 *   switch    state change the user made on purpose  (toggle, filter, segment)
 *   pop       a small reward                        (a like)
 *   success   a milestone                           (the final like)
 *   deny      a refusal                             (the like cap)
 *   gameOver  an ending                             (snake)
 *
 * Navigation is deliberately absent: it is not a confirmation, and a sound on
 * every link would fire on nearly every tap.
 *
 * Conventions follow the UI Wiki audio rules — filtered noise for percussive
 * attacks, oscillators with pitch movement for tonal sounds, exponential decay
 * envelopes that target near-zero, and gain kept well under 1.0.
 */

/**
 * One-shot sources are cheap to leave to the GC, but disconnecting frees the
 * node graph the moment it has finished playing.
 */
function autoDisconnect(node: AudioScheduledSourceNode) {
  node.onended = () => node.disconnect();
}

/**
 * A state change the user made on purpose.
 *
 * A band-passed noise burst gives it the "click" (noise, not an oscillator, is
 * what makes a click read as percussive); a short rising sine underneath keeps
 * it friendly rather than mechanical.
 */
export function createSwitchSound(ctx: AudioContext, t: number, volMult = 1) {
  const length = Math.ceil(ctx.sampleRate * 0.008); // 8ms
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const decayInSamples = ctx.sampleRate * 0.0015;
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decayInSamples);
  }

  const click = ctx.createBufferSource();
  click.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 3800;
  bandpass.Q.value = 3;

  const clickGain = ctx.createGain();
  clickGain.gain.value = 0.14 * volMult;

  click.connect(bandpass).connect(clickGain).connect(ctx.destination);
  autoDisconnect(click);
  click.start(t);

  // The tonal half of the click.
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(620, t);
  body.frequency.exponentialRampToValueAtTime(880, t + 0.045);

  bodyGain.gain.setValueAtTime(0, t);
  bodyGain.gain.linearRampToValueAtTime(0.1 * volMult, t + 0.005);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  body.connect(bodyGain).connect(ctx.destination);
  autoDisconnect(body);
  body.start(t);
  body.stop(t + 0.07);
}

/**
 * A small reward — the sound of liking something. A round upward bloop with a
 * quiet octave sparkle. `pitch` scales it, so a run of likes can climb.
 */
export function createPopSound(
  ctx: AudioContext,
  t: number,
  volMult = 1,
  pitch = 1
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(1020 * pitch, t + 0.06);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22 * volMult, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(ctx.destination);
  autoDisconnect(osc);
  osc.start(t);
  osc.stop(t + 0.1);

  const sheen = ctx.createOscillator();
  const sheenGain = ctx.createGain();
  sheen.type = "sine";
  sheen.frequency.setValueAtTime(1200 * pitch, t);
  sheen.frequency.exponentialRampToValueAtTime(2040 * pitch, t + 0.06);
  sheenGain.gain.setValueAtTime(0, t);
  sheenGain.gain.linearRampToValueAtTime(0.06 * volMult, t + 0.006);
  sheenGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  sheen.connect(sheenGain).connect(ctx.destination);
  autoDisconnect(sheen);
  sheen.start(t);
  sheen.stop(t + 0.06);
}

/**
 * A bright major triad — G5, B5, D6 — that steps upward and lets the last note
 * ring a little longer. Reserved for milestones.
 */
export function createSuccessSound(ctx: AudioContext, t: number, volMult = 1) {
  const notes = [783.99, 987.77, 1174.66];
  const spacing = 0.06;

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;

    const start = t + i * spacing;
    const decay = 0.28 + i * 0.06;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.14 * volMult, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + decay);

    osc.connect(gain).connect(ctx.destination);
    autoDisconnect(osc);
    osc.start(start);
    osc.stop(start + decay);
  });
}

/**
 * A gentle two-note "uh-uh" for a refused action. Descending and soft — it
 * informs without punishing.
 */
export function createDenySound(ctx: AudioContext, t: number, volMult = 1) {
  const notes = [680, 520];
  const spacing = 0.085;
  const decay = 0.14;

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;

    const start = t + i * spacing;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16 * volMult, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + decay);

    osc.connect(gain).connect(ctx.destination);
    autoDisconnect(osc);
    osc.start(start);
    osc.stop(start + decay);
  });
}

/** Three soft, descending notes: disappointed rather than dramatic. */
export function createGameOverSound(
  ctx: AudioContext,
  t: number,
  volMult = 1
) {
  const notes = [740, 622, 494];
  const spacing = 0.13;

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;

    const start = t + i * spacing;
    const decay = i === notes.length - 1 ? 0.5 : 0.24;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16 * volMult, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + decay);

    osc.connect(gain).connect(ctx.destination);
    autoDisconnect(osc);
    osc.start(start);
    osc.stop(start + decay);
  });
}
