/**
 * Synthesised, material-based sound effects. Nothing is recorded or bundled: each sound is
 * built from a few oscillators and filtered noise, shaped to read as metal, glass, wood…
 */

export type SoundMaterial =
  | "metal"
  | "bell"
  | "glass"
  | "wood"
  | "soft"
  | "paper"
  | "plastic"
  | "magic"
  | "laser"
  | "retro"
  | "pop"
  | "punch"
  | "none";

export const SOUND_MATERIALS: SoundMaterial[] = [
  "metal",
  "bell",
  "glass",
  "wood",
  "soft",
  "paper",
  "plastic",
  "magic",
  "laser",
  "retro",
  "pop",
  "punch",
  "none",
];

export const SOUND_LABELS: Record<SoundMaterial, string> = {
  metal: "Metal clink",
  bell: "Bell",
  glass: "Glass chime",
  wood: "Wooden knock",
  soft: "Soft plush",
  paper: "Paper rustle",
  plastic: "Plastic click",
  magic: "Magic sparkle",
  laser: "Laser zap",
  retro: "8-bit blip",
  pop: "Pop",
  punch: "Comic punch",
  none: "Silent",
};

export type SoundEvent = "grab" | "release" | "whoosh";

export function isSoundMaterial(value: unknown): value is SoundMaterial {
  return typeof value === "string" && (SOUND_MATERIALS as string[]).includes(value);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;
  private volume = 0.6;

  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** Audio can only start after a user gesture, which every caller here is. */
  private ensure(): AudioContext | null {
    if (typeof AudioContext === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(compressor).connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 1.5);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  play(material: SoundMaterial, event: SoundEvent, intensity = 0.6) {
    if (!this.enabled || this.volume <= 0 || material === "none") return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const k = Math.min(1, Math.max(0.15, intensity));
    try {
      if (event === "whoosh") this.whoosh(ctx, k);
      else RECIPES[material](this, ctx, event, k);
    } catch {
      /* a dropped sound effect is never worth an error */
    }
  }

  /** A decaying oscillator with an optional pitch glide. */
  tone(
    ctx: AudioContext,
    freq: number,
    opts: { type?: OscillatorType; gain: number; decay: number; delay?: number; to?: number; attack?: number },
  ) {
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + opts.decay + 0.05);
  }

  /** A burst of filtered noise; the filter decides whether it reads as rustle, knock, or thud. */
  noise(
    ctx: AudioContext,
    opts: {
      filter: BiquadFilterType;
      freq: number;
      q?: number;
      gain: number;
      decay: number;
      delay?: number;
      sweepTo?: number;
      attack?: number;
    },
  ) {
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter;
    filter.frequency.setValueAtTime(opts.freq, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.decay);
    filter.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.8);
    src.stop(t + opts.decay + 0.05);
  }

  private whoosh(ctx: AudioContext, k: number) {
    this.noise(ctx, { filter: "bandpass", freq: 380, sweepTo: 1700, q: 1.4, gain: 0.12 * k, decay: 0.28, attack: 0.06 });
  }
}

type Recipe = (e: SoundEngine, ctx: AudioContext, event: SoundEvent, k: number) => void;

/** Partials of a struck object; inharmonic ratios are what make metal and glass ring. */
function partials(e: SoundEngine, ctx: AudioContext, base: number, ratios: number[], gain: number, decay: number) {
  ratios.forEach((r, i) => e.tone(ctx, base * r, { gain: gain / (i + 1), decay: decay / (1 + i * 0.35) }));
}

const RECIPES: Record<Exclude<SoundMaterial, "none">, Recipe> = {
  metal: (e, ctx, ev, k) => {
    const base = ev === "grab" ? 2300 : 1800;
    partials(e, ctx, base, [1, 1.58, 2.24, 2.91], 0.22 * k, ev === "grab" ? 0.16 : 0.42);
    e.noise(ctx, { filter: "highpass", freq: 5000, gain: 0.08 * k, decay: 0.03 });
  },
  bell: (e, ctx, ev, k) => {
    if (ev === "grab") return partials(e, ctx, 1760, [1, 2.76], 0.1 * k, 0.25);
    partials(e, ctx, 880, [1, 2.76, 5.4, 8.93], 0.3 * k, 1.8);
    e.tone(ctx, 440, { gain: 0.08 * k, decay: 1.2 });
  },
  glass: (e, ctx, ev, k) => {
    if (ev === "grab") return e.tone(ctx, 3520, { gain: 0.12 * k, decay: 0.3 });
    [2637, 3520, 4186].forEach((f, i) => e.tone(ctx, f, { gain: 0.14 * k, decay: 1.1, delay: i * 0.035 }));
  },
  wood: (e, ctx, ev, k) => {
    e.noise(ctx, { filter: "bandpass", freq: 950, q: 4, gain: 0.35 * k, decay: 0.07 });
    e.tone(ctx, ev === "grab" ? 520 : 420, { gain: 0.25 * k, decay: 0.12, to: 300 });
  },
  soft: (e, ctx, ev, k) => {
    e.noise(ctx, { filter: "lowpass", freq: 700, gain: 0.22 * k, decay: ev === "grab" ? 0.08 : 0.16 });
    e.tone(ctx, 150, { gain: 0.22 * k, decay: 0.16, to: 85 });
  },
  paper: (e, ctx, ev, k) => {
    const n = ev === "grab" ? 2 : 4;
    for (let i = 0; i < n; i++) {
      e.noise(ctx, { filter: "highpass", freq: 2400, gain: 0.1 * k, decay: 0.07, delay: i * 0.045 });
    }
  },
  plastic: (e, ctx, ev, k) => {
    e.noise(ctx, { filter: "bandpass", freq: 2600, q: 2, gain: 0.2 * k, decay: 0.03 });
    e.tone(ctx, ev === "grab" ? 1500 : 1200, { type: "square", gain: 0.05 * k, decay: 0.04 });
  },
  magic: (e, ctx, ev, k) => {
    const notes = ev === "grab" ? [1568, 2093] : [1319, 1760, 2093, 2637, 3136];
    notes.forEach((f, i) => e.tone(ctx, f, { gain: 0.1 * k, decay: 0.5, delay: i * 0.055 }));
    e.noise(ctx, { filter: "highpass", freq: 7000, gain: 0.04 * k, decay: 0.5, attack: 0.05 });
  },
  laser: (e, ctx, ev, k) => {
    if (ev === "grab") return e.tone(ctx, 900, { type: "sawtooth", gain: 0.05 * k, decay: 0.09, to: 1500 });
    e.tone(ctx, 1900, { type: "sawtooth", gain: 0.07 * k, decay: 0.28, to: 260 });
    e.tone(ctx, 1910, { type: "square", gain: 0.03 * k, decay: 0.28, to: 270 });
  },
  retro: (e, ctx, ev, k) => {
    const notes = ev === "grab" ? [660, 990] : [988, 1319];
    notes.forEach((f, i) => e.tone(ctx, f, { type: "square", gain: 0.06 * k, decay: 0.09, delay: i * 0.075, attack: 0.001 }));
  },
  pop: (e, ctx, ev, k) => {
    e.tone(ctx, ev === "grab" ? 700 : 520, { gain: 0.26 * k, decay: 0.09, to: 150 });
    e.noise(ctx, { filter: "highpass", freq: 3000, gain: 0.06 * k, decay: 0.02 });
  },
  punch: (e, ctx, ev, k) => {
    if (ev === "grab") return e.noise(ctx, { filter: "bandpass", freq: 1400, q: 1, gain: 0.15 * k, decay: 0.05 });
    e.noise(ctx, { filter: "lowpass", freq: 1600, gain: 0.45 * k, decay: 0.16 });
    e.tone(ctx, 130, { gain: 0.4 * k, decay: 0.22, to: 48 });
  },
};

export const sounds = new SoundEngine();
