import { settings } from '../state/settings';

/**
 * Owns the AudioContext and the mix buses:
 *   music -> musicDuck -> master
 *   sfx   -> master
 *   voice -> master
 *   master -> limiter -> destination
 * The context is created lazily and resumed on the first user gesture
 * (browser autoplay policy).
 */
class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  musicDuck!: GainNode;
  musicFilter!: BiquadFilterNode;
  sfx!: GainNode;
  voice!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  noise!: AudioBuffer;
  private unsub: (() => void) | null = null;

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.connect(limiter);

    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicDuck = ctx.createGain();
    this.music = ctx.createGain();
    this.music.connect(this.musicFilter);
    this.musicFilter.connect(this.musicDuck);
    this.musicDuck.connect(this.master);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.voice = ctx.createGain();
    this.voice.connect(this.master);

    // Small synthetic room reverb shared by music + sfx sends.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.8, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.25;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);

    this.noise = this.makeNoise(2);
    this.applySettings();
    this.unsub = settings.subscribe(() => this.applySettings());

    const resume = () => {
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume);
    window.addEventListener('touchend', resume, { passive: true });
    return ctx;
  }

  resume(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  applySettings(): void {
    if (!this.ctx) return;
    const s = settings.get();
    const t = this.ctx.currentTime;
    const m = s.muted ? 0 : s.master;
    this.master.gain.setTargetAtTime(m, t, 0.03);
    this.music.gain.setTargetAtTime(s.music * 0.55, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfx * 0.8, t, 0.03);
    this.voice.gain.setTargetAtTime(s.voiceActing ? s.voice * 1.1 : 0, t, 0.03);
  }

  /** Duck music under voice lines. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.musicDuck.gain.setTargetAtTime(on ? 0.38 : 1, this.ctx.currentTime, on ? 0.05 : 0.35);
  }

  /** Muffle the music (pause menu, dream sequences, slow-mo). */
  muffle(amount: number): void {
    if (!this.ctx) return;
    const f = amount <= 0 ? 20000 : 20000 * Math.pow(0.012, amount);
    this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.12);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  dispose(): void {
    this.unsub?.();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioEngine();
