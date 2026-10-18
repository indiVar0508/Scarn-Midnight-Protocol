import { beforeEach, describe, expect, it } from 'vitest';
import { audio } from './engine';
import { SONGS } from './songs';
import { playInst, type InstName } from './synth';
import { sfx, resetSfxThrottle } from './sfx';

// A finished note must leave the mix. Its gains, filters and waveshapers otherwise stay connected
// until garbage collection and Chrome's audio thread keeps processing them: the Scene 3 montage
// piled up thousands, the thread fell behind, and voice lines broke up (TECH gotcha 32).

class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
}

class FakeNode {
  outs = new Set<unknown>();
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  pan = new FakeParam();
  connect<T>(to: T): T {
    this.outs.add(to);
    return to;
  }
  disconnect() {
    this.outs.clear();
  }
}

class FakeSource extends FakeNode {
  private onEnded: (() => void)[] = [];
  start() {}
  stop() {}
  addEventListener(_: 'ended', f: () => void) {
    this.onEnded.push(f);
  }
  end() {
    this.onEnded.splice(0).forEach((f) => f());
  }
}

class FakeContext {
  currentTime = 0;
  nodes: FakeNode[] = [];
  sources: FakeSource[] = [];
  private add<T extends FakeNode>(n: T): T {
    this.nodes.push(n);
    if (n instanceof FakeSource) this.sources.push(n);
    return n;
  }
  createGain = () => this.add(new FakeNode());
  createBiquadFilter = () => this.add(new FakeNode());
  createWaveShaper = () => this.add(new FakeNode());
  createStereoPanner = () => this.add(new FakeNode());
  createOscillator = () => this.add(new FakeSource());
  createBufferSource = () => this.add(new FakeSource());
}

let ctx: FakeContext;
const bus = (name: 'music' | 'sfx' | 'reverbSend') => audio[name] as unknown as FakeNode;
beforeEach(() => {
  ctx = new FakeContext();
  Object.assign(audio, { ctx, noise: {}, music: new FakeNode(), sfx: new FakeNode(), reverbSend: new FakeNode() });
  resetSfxThrottle();
});
/** The nodes still feeding any of `into`. */
const feeding = (...into: FakeNode[]) => ctx.nodes.filter((n) => into.some((b) => n.outs.has(b)));

const INSTRUMENTS = [...new Set(Object.values(SONGS).flatMap((s) => Object.values(s.instruments).map((i) => i.inst)))] as InstName[];

describe('a music note', () => {
  it.each(INSTRUMENTS)('%s leaves the mix when its last source ends, not before', (inst) => {
    const [out, send] = [bus('music'), bus('reverbSend')];
    playInst(inst, 0, 220, 0.5, 0.8, out as unknown as AudioNode, send as unknown as AudioNode);
    expect(feeding(out, send).length).toBeGreaterThan(0);
    // Any one source still playing keeps the note in (a source the note doesn't wait for would be
    // cut off mid-sound).
    const [last, ...rest] = [...ctx.sources].reverse();
    rest.forEach((s) => s.end());
    expect(feeding(out, send).length, 'still sounding').toBeGreaterThan(0);
    last.end();
    expect(feeding(out, send)).toEqual([]);
  });
});

describe('a sound effect', () => {
  // Tones and noise bursts, panned and centred, dry and with a reverb send.
  it.each(['shoot', 'explosion', 'ui_select', 'glass', 'beep', 'whistle'])('%s leaves the mix when it ends', (name) => {
    sfx(name, name === 'ui_select' ? 0 : 0.4);
    expect(ctx.sources.length, 'it played').toBeGreaterThan(0);
    ctx.sources.forEach((s) => s.end());
    expect(feeding(bus('sfx'), bus('reverbSend'))).toEqual([]);
  });
});
