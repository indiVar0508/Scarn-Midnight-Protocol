import { audio } from './engine';
import { settings } from '../state/settings';

/**
 * Pre-rendered voice lines (public/voice/<id>.mp3), listed in manifest.json
 * with their durations. Lines are fetched lazily and cached; playback ducks
 * the music bus.
 */
type Manifest = Record<string, number>; // id -> duration ms

class VoicePlayer {
  private manifest: Manifest | null = null;
  private loading: Promise<void> | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: AudioBufferSourceNode | null = null;
  private currentId: string | null = null;
  private playToken = 0;

  loadManifest(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = fetch('/voice/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Manifest) => {
        this.manifest = m;
      })
      .catch(() => {
        this.manifest = {};
      });
    return this.loading;
  }

  has(id: string): boolean {
    return !!this.manifest && id in this.manifest;
  }

  duration(id: string): number {
    return this.manifest?.[id] ?? 0;
  }

  private fetchBuffer(id: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(id);
    if (!p) {
      p = fetch(`/voice/${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
        .then((ab) => {
          const ctx = audio.ctx;
          if (!ctx) return null;
          return ctx.decodeAudioData(ab);
        })
        .catch(() => null);
      this.buffers.set(id, p);
    }
    return p;
  }

  /** Warm the cache for upcoming lines (a chapter's worth). */
  preload(ids: string[]): void {
    if (!this.manifest || !audio.ctx) return;
    for (const id of ids) if (this.has(id)) void this.fetchBuffer(id);
  }

  /** Play a line. Resolves when it finishes (or immediately if unavailable/disabled). */
  async play(id: string, opts: { rate?: number; reverse?: boolean } = {}): Promise<void> {
    this.stop();
    const token = ++this.playToken;
    if (!settings.get().voiceActing || !audio.ctx) return;
    await this.loadManifest();
    if (!this.has(id)) return;
    const buf = await this.fetchBuffer(id);
    if (!buf || token !== this.playToken || !audio.ctx) return;
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = opts.reverse ? reverseBuffer(ctx, buf) : buf;
    src.playbackRate.value = opts.rate ?? 1;
    src.connect(audio.voice);
    this.current = src;
    this.currentId = id;
    audio.duck(true);
    return new Promise<void>((resolve) => {
      src.onended = () => {
        if (this.current === src) {
          this.current = null;
          this.currentId = null;
          audio.duck(false);
        }
        resolve();
      };
      src.start();
    });
  }

  /** Raw buffer access for the tape-deck puzzle. */
  async buffer(id: string): Promise<AudioBuffer | null> {
    await this.loadManifest();
    if (!this.has(id)) return null;
    return this.fetchBuffer(id);
  }

  isPlaying(id?: string): boolean {
    return id ? this.currentId === id : !!this.current;
  }

  stop(): void {
    this.playToken++;
    if (this.current) {
      try {
        this.current.onended = null;
        this.current.stop();
      } catch {
        /* already stopped */
      }
      this.current = null;
      this.currentId = null;
      audio.duck(false);
    }
  }
}

export function reverseBuffer(ctx: BaseAudioContext, buf: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i];
  }
  return out;
}

export const voice = new VoicePlayer();
