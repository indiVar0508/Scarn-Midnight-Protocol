import type { InstName } from './synth';

/**
 * All music is original and written as step patterns (16 steps per bar).
 * Melodic tokens: note ("C4"), chord ("C4+E4" or "@Am7:3"), "." rest, "-" hold.
 * Suffix "!" = accent, "?" = soft. Drum chars: X loud, x normal, o soft, p ghost.
 * Patterns shorter than their section repeat.
 */
export interface SongDef {
  id: string;
  bpm: number;
  swing?: number;
  gain?: number;
  loop?: boolean;
  loopFrom?: number;
  instruments: Record<string, { inst: InstName; vol: number; send?: number }>;
  sections: Record<string, { bars: number; tracks: Record<string, string> }>;
  order: string[];
}

const r = (s: string, n: number): string => Array.from({ length: n }, () => s).join(' ');

// ---------------------------------------------------------------------------
// SPY THEME: menu / title / credits. Surf-spy in A minor.
// ---------------------------------------------------------------------------
const spyBass = 'A2 . A2 C3 . A2 D3 . A2 Eb3 - E3 . C3 G2 .';
const spy: SongDef = {
  id: 'spy',
  bpm: 112,
  instruments: {
    kick: { inst: 'kick', vol: 0.8 },
    snare: { inst: 'snare', vol: 0.5, send: 1 },
    hat: { inst: 'hat', vol: 0.5 },
    tom: { inst: 'tom', vol: 0.5 },
    crash: { inst: 'crash', vol: 0.5, send: 1 },
    bass: { inst: 'bass', vol: 0.8 },
    surf: { inst: 'surf', vol: 0.85, send: 1 },
    brass: { inst: 'brass', vol: 0.7, send: 1 },
    pad: { inst: 'strings', vol: 0.6, send: 1 },
  },
  sections: {
    intro: {
      bars: 4,
      tracks: {
        bass: spyBass,
        hat: '..x...x...x...x.',
        tom: '................|................|................|....x.x.x.xxXXXX'.replace(/X/g, 'x'),
        pad: '@Am:3 - - - - - - - - - - - - - - - ' + r('- - - - - - - - - - - - - - - -', 3),
      },
    },
    A: {
      bars: 8,
      tracks: {
        kick: 'x.......x..x....',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: 'X...............' + r('................', 7),
        bass: spyBass,
        surf: [
          'E4 - - - - - - - A4 - - - G4 - E4 -',
          'D4 - - - E4 - - - - - - - . . . .',
          'E4 - - - - - - - A4 - - - C5 - B4 -',
          'A4 - - - - - - - - - - - . . . .',
          'C5 - - - B4 - A4 - G4 - - - E4 - - -',
          'G4 - - - A4 - - - - - - - . . E4 -',
          'Eb4 - - - E4 - - - G4 - - - A4 - C5 -',
          'B4 - - - - - - - A4 - - - - - - -',
        ].join(' '),
      },
    },
    B: {
      bars: 8,
      tracks: {
        kick: 'x.......x.x.....',
        snare: '....x.......x..o',
        hat: 'x.xox.xox.xox.xo',
        crash: 'X...............' + r('................', 3) + 'X...............' + r('................', 3),
        bass: [
          'D2 . D2 F2 . D2 G2 . D2 Ab2 - A2 . F2 C2 .',
          'D2 . D2 F2 . D2 G2 . D2 Ab2 - A2 . F2 C2 .',
          spyBass,
          spyBass,
          'F2 . F2 A2 . F2 C3 . F2 A2 - C3 . A2 F2 .',
          'F2 . F2 A2 . F2 C3 . F2 A2 - C3 . A2 F2 .',
          'E2 . E2 G#2 . E2 B2 . E2 D3 - E3 . D3 B2 .',
          'E2 . E2 G#2 . E2 B2 . E3 . E2 . E3 . E2 .',
        ].join(' '),
        brass: [
          '@Dm:4! . . @Dm:4 . . @Dm:4 - . . . . . . . .',
          '. . . . . . . . @F:4 - . @E:4 - - - -',
          '@Am:4! . . @Am:4 . . @Am:4 - . . . . . . . .',
          '. . . . . . . . @C:5 - . @B:4 - - - -',
          '@F:4! . . @F:4 . . @F:4 - . . . . . . . .',
          '. . . . . . . . @G:4 - . @A:4 - - - -',
          '@E7:4! - - - - - - - . . . . @E7:4 - - -',
          '. . . . . . . . . . . . . . . .',
        ].join(' '),
        pad: '@Dm:3 - - - - - - - - - - - - - - - ' + r('- - - - - - - - - - - - - - - -', 1) +
          ' @Am:3 - - - - - - - - - - - - - - - ' + r('- - - - - - - - - - - - - - - -', 1) +
          ' @F:3 - - - - - - - - - - - - - - - ' + r('- - - - - - - - - - - - - - - -', 1) +
          ' @E7:3 - - - - - - - - - - - - - - - ' + r('- - - - - - - - - - - - - - - -', 1),
      },
    },
  },
  order: ['intro', 'A', 'B', 'A'],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// ACTION: combat. 150 bpm D minor, driving.
// ---------------------------------------------------------------------------
const actBassDm = 'D2 - D2 - D3 - D2 - D2 - D2 - C3 - D2 -';
const action: SongDef = {
  id: 'action',
  bpm: 150,
  instruments: {
    kick: { inst: 'kick', vol: 0.9 },
    snare: { inst: 'snare', vol: 0.6, send: 1 },
    hat: { inst: 'hat', vol: 0.45 },
    crash: { inst: 'crash', vol: 0.45, send: 1 },
    bass: { inst: 'bass', vol: 0.85 },
    stab: { inst: 'stab', vol: 0.7, send: 1 },
    lead: { inst: 'lead', vol: 0.65, send: 1 },
    pad: { inst: 'strings', vol: 0.45, send: 1 },
  },
  sections: {
    A: {
      bars: 4,
      tracks: {
        kick: 'x.x...x.x.x...x.',
        snare: '....X.......X...',
        hat: 'xoxoxoxoxoxoxoxo',
        bass: [actBassDm, 'D2 - D2 - D3 - D2 - F2 - F2 - G2 - A2 -', 'Bb1 - Bb1 - Bb2 - Bb1 - Bb1 - Bb1 - A2 - Bb1 -', 'C2 - C2 - C3 - C2 - E2 - E2 - G2 - A2 -'].join(' '),
        stab: '. . . . . . @Dm:4! . . . . . . . . . ' + r('. . . . . . . . . . . . . . . .', 3),
      },
    },
    B: {
      bars: 8,
      tracks: {
        kick: 'x.x...x.x.x...x.',
        snare: '....X.......X..o',
        hat: 'xoxoxoxoxoxoxoxo',
        crash: 'X...............' + r('................', 7),
        bass: [
          actBassDm,
          actBassDm,
          'Bb1 - Bb1 - Bb2 - Bb1 - Bb1 - Bb1 - A2 - Bb1 -',
          'C2 - C2 - C3 - C2 - C2 - C2 - E2 - C2 -',
          actBassDm,
          actBassDm,
          'G1 - G1 - G2 - G1 - G1 - G1 - Bb1 - G1 -',
          'A1 - A1 - A2 - A1 - C#2 - C#2 - E2 - A2 -',
        ].join(' '),
        lead: [
          'D5 - - - A4 - - - D5 - E5 - F5 - - -',
          'E5 - D5 - C5 - - - A4 - - - - - - -',
          'D5 - - - F5 - - - Bb5 - - - A5 - G5 -',
          'G5 - - - - - - - E5 - F5 - G5 - - -',
          'A5 - - - F5 - - - D5 - - - F5 - A5 -',
          'G5 - F5 - E5 - - - D5 - - - - - - -',
          'Bb4 - - - D5 - - - G5 - - - F5 - E5 -',
          'E5 - - - - - - - C#5 - - - A4 - - -',
        ].join(' '),
        pad:
          '@Dm:3 ' + r('-', 31) + ' @Bb:2 ' + r('-', 15) + ' @C:3 ' + r('-', 15) + ' @Dm:3 ' + r('-', 31) + ' @Gm:3 ' + r('-', 15) + ' @A7:3 ' + r('-', 15),
      },
    },
  },
  order: ['A', 'B', 'B'],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// MANOR: lounge bossa for Scarn Manor.
// ---------------------------------------------------------------------------
const manor: SongDef = {
  id: 'manor',
  bpm: 100,
  swing: 0.12,
  instruments: {
    shaker: { inst: 'shaker', vol: 0.5 },
    rim: { inst: 'rim', vol: 0.6 },
    kick: { inst: 'kick', vol: 0.45 },
    bass: { inst: 'upright', vol: 0.9 },
    ep: { inst: 'ep', vol: 0.7, send: 1 },
    vibes: { inst: 'vibes', vol: 0.8, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        shaker: 'xoxoxoxoxoxoxoxo',
        rim: 'x..x..x...x..x..',
        kick: 'x.......x.......',
        bass: [
          'D2 - - - - - A2 - D2 - - - - - A2 -',
          'G2 - - - - - D2 - G2 - - - - - D2 -',
          'C2 - - - - - G2 - C2 - - - - - G2 -',
          'A2 - - - - - E2 - A2 - - - - - E2 -',
        ].join(' '),
        ep: [
          '@Dm9:3 - - @Dm9:3 - - . . . . @Dm9:3 - - . . .',
          '@G13:2 - - @G13:2 - - . . . . @G13:2 - - . . .',
          '@Cmaj9:3 - - @Cmaj9:3 - - . . . . @Cmaj9:3 - - . . .',
          '@A7b9:2 - - @A7b9:2 - - . . . . @A7b9:2 - - . . .',
        ].join(' '),
        vibes: [
          '. . . . A4 - - - F4 - - - E4 - D4 -',
          'F4 - - - - - - - . . . . . . . .',
          '. . . . G4 - - - E4 - - - D4 - C4 -',
          'E4 - - - - - - - C#4 - - - . . . .',
          '. . . . A4 - C5 - - - A4 - F4 - E4 -',
          'D4 - - - F4 - - - B4 - - - A4 - - -',
          'G4 - - - - - E4 - - - D4 - - - B3 -',
          'C#4 - - - E4 - - - A4 - - - . . . .',
        ].join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// MONTAGE: cheesy training-montage rock.
// ---------------------------------------------------------------------------
const pc = (n: string) => r(`${n} - `, 8).trim();
const montage: SongDef = {
  id: 'montage',
  bpm: 132,
  instruments: {
    kick: { inst: 'kick', vol: 0.95 },
    snare: { inst: 'snare', vol: 0.7, send: 1 },
    hat: { inst: 'hat', vol: 0.45 },
    crash: { inst: 'crash', vol: 0.5, send: 1 },
    gtr: { inst: 'guitar', vol: 0.9 },
    bass: { inst: 'bass', vol: 0.75 },
    lead: { inst: 'lead', vol: 0.7, send: 1 },
    pad: { inst: 'synthpad', vol: 0.4, send: 1 },
  },
  sections: {
    intro: {
      bars: 2,
      tracks: {
        gtr: 'E2! - - - - - - - - - - - - - - - ' + 'E2! - - - - - - - D2 - - - D2 - D2 -',
        snare: '................' + '........x.x.xxxx',
        crash: 'X...............',
      },
    },
    A: {
      bars: 8,
      tracks: {
        kick: 'x.....x.x.......',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: 'X...............' + r('................', 3) + 'X...............' + r('................', 3),
        gtr: [pc('E2'), pc('C2'), pc('D2'), pc('A2'), pc('E2'), pc('C2'), pc('D2'), pc('E2')].join(' '),
        bass: [pc('E2'), pc('C2'), pc('D2'), pc('A1'), pc('E2'), pc('C2'), pc('D2'), pc('E2')].join(' '),
        lead: [
          'E5 - - - B4 - - - G#4 - B4 - E5 - F#5 -',
          'G5 - - - E5 - - - C5 - - - E5 - G5 -',
          'F#5 - - - D5 - - - A4 - D5 - F#5 - A5 -',
          'G#5 - - - - - - - E5 - - - C#5 - E5 -',
          'E5 - - - B4 - - - G#4 - B4 - E5 - F#5 -',
          'G5 - - - A5 - - - G5 - - - E5 - C5 -',
          'D5 - - - F#5 - - - A5 - - - B5 - - -',
          'B5 - - - - - - - - - - - . . . .',
        ].join(' '),
        pad: ['@E:3', '@C:3', '@D:3', '@A:3', '@E:3', '@C:3', '@D:3', '@E:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
      },
    },
  },
  order: ['intro', 'A', 'A'],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// TRYOUT: stadium organ + stomp clap.
// ---------------------------------------------------------------------------
const tryout: SongDef = {
  id: 'tryout',
  bpm: 138,
  instruments: {
    kick: { inst: 'kick', vol: 0.9 },
    clap: { inst: 'clap', vol: 0.7, send: 1 },
    hat: { inst: 'hat', vol: 0.4 },
    organ: { inst: 'organ', vol: 0.85, send: 1 },
    bass: { inst: 'bass', vol: 0.7 },
  },
  sections: {
    A: {
      bars: 4,
      tracks: {
        kick: 'x...x...x...x...',
        clap: '....x.......x...',
        hat: '..x...x...x...x.',
        organ: [
          'C4 . E4 . G4 . C5 - - . G4 . C5 - - -',
          'F4 . A4 . C5 . F5 - - . C5 . F5 - - -',
          'G4 . B4 . D5 . G5 - - . D5 . G5 - F5 -',
          'E5 - - D5 - - C5 - - - - - . . . .',
        ].join(' '),
        bass: ['C2 - C2 - G2 - C2 -', 'C2 - C2 - G2 - C2 -', 'F2 - F2 - C3 - F2 -', 'F2 - F2 - C3 - F2 -', 'G2 - G2 - D3 - G2 -', 'G2 - G2 - D3 - G2 -', 'C2 - C2 - G2 - C2 -', 'C2 - G1 - A1 - B1 -'].join(' '),
      },
    },
    B: {
      bars: 4,
      tracks: {
        kick: 'x...x...x...x...',
        clap: 'x.x.x.x.xxx.....',
        hat: 'x.x.x.x.x.x.x.x.',
        organ: [
          '@C:4 - . @C:4 - . @C:4 - @F:4 - - - @G:4 - - -',
          '@C:4 - . @C:4 - . @C:4 - @Am:4 - - - @G:4 - - -',
          '@F:4 - . @F:4 - . @F:4 - @G:4 - - - @E7:4 - - -',
          '@Am:4 - - - @F:4 - - - @G:4 - - - - - - -',
        ].join(' '),
        bass: ['C2 - C3 - C2 - C3 -', 'C2 - C3 - C2 - C3 -', 'C2 - C3 - C2 - C3 -', 'A1 - A2 - G1 - G2 -', 'F1 - F2 - F1 - F2 -', 'G1 - G2 - E1 - E2 -', 'A1 - A2 - F1 - F2 -', 'G1 - G2 - G1 - G2 -'].join(' '),
      },
    },
  },
  order: ['A', 'B'],
};

// ---------------------------------------------------------------------------
// JAZZ: The Funky Cat. Swung noir in C minor.
// ---------------------------------------------------------------------------
const walk = [
  'C2 - - - Eb2 - - - G2 - - - Bb2 - - -',
  'F2 - - - Ab2 - - - C3 - - - Eb3 - - -',
  'D2 - - - F2 - - - Ab2 - - - C3 - - -',
  'G2 - - - B2 - - - D3 - - - F2 - - -',
].join(' ');
const jazz: SongDef = {
  id: 'jazz',
  bpm: 96,
  swing: 0.33,
  instruments: {
    ride: { inst: 'hat', vol: 0.55 },
    brush: { inst: 'snare', vol: 0.18, send: 1 },
    kick: { inst: 'kick', vol: 0.3 },
    bass: { inst: 'upright', vol: 1 },
    ep: { inst: 'ep', vol: 0.55, send: 1 },
    sax: { inst: 'sax', vol: 0.8, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        ride: 'x...x.x.x...x.x.',
        brush: 'p.p.o.p.p.p.o.p.',
        kick: 'o.......o.......',
        bass: walk,
        ep: [
          '. . . . . . @Cm7:3 - . . . . . . @Cm7:3 ?',
          '. . . . . . @Fm7:3 - . . . . . . @Fm7:3 ?',
          '. . . . . . @Dm7b5:3 - . . . . . . . .',
          '. . . . . . @G7:2 - . . . . @G7:2 - . .',
        ].join(' '),
        sax: [
          'G4 - - - - - Eb4 - F4 - G4 - - - Bb4 -',
          'Ab4 - - - - - - - F4 - - - . . . .',
          '. . C5 - Bb4 - Ab4 - F4 - - - D4 - F4 -',
          'G4 - - - - - - - . . . . B3 - D4 -',
          'Eb4 - - - G4 - - - C5 - - - Eb5 - D5 -',
          'C5 - - - Ab4 - - - F4 - - - . . . .',
          '. . Ab4 - G4 - F4 - D4 - - - F4 - Ab4 -',
          'G4 - - - - - - - - - - - . . . .',
        ].join(' '),
      },
    },
  },
  order: ['A'],
};

// Jasmine's stage number: slower ballad, her (reversed) vocal is layered on top at runtime.
const jasmine: SongDef = {
  id: 'jasmine',
  bpm: 72,
  swing: 0.3,
  instruments: {
    ride: { inst: 'hat', vol: 0.35 },
    brush: { inst: 'snare', vol: 0.12, send: 1 },
    bass: { inst: 'upright', vol: 0.9 },
    ep: { inst: 'ep', vol: 0.65, send: 1 },
    vibes: { inst: 'vibes', vol: 0.4, send: 1 },
  },
  sections: {
    A: {
      bars: 4,
      tracks: {
        ride: 'x...x.x.x...x.x.',
        brush: 'p...o...p...o...',
        bass: walk,
        ep: '@Cm9:3 - - - - - - - @Cm9:3 - - - . . . . @Fm9:3 - - - - - - - @Fm9:3 - - - . . . . @Dm7b5:3 - - - - - - - . . . . . . . . @G7b9:2 - - - - - - - - - - - . . . .',
        vibes: '. . . . . . . . G5 - - - . . . . . . . . . . . . Ab5 - - - . . . . . . . . . . . . F5 - - - . . . . . . . . . . . . D5 - - - B4 - - -',
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// STEALTH: pulsing F minor.
// ---------------------------------------------------------------------------
const stealth: SongDef = {
  id: 'stealth',
  bpm: 96,
  instruments: {
    tick: { inst: 'hat', vol: 0.3 },
    kick: { inst: 'kick', vol: 0.5 },
    rim: { inst: 'rim', vol: 0.4 },
    sub: { inst: 'subbass', vol: 0.8 },
    pluck: { inst: 'pluck', vol: 0.55, send: 1 },
    pad: { inst: 'synthpad', vol: 0.5, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        tick: 'x.o.x.o.x.o.x.oo',
        kick: 'x.......x.....x.',
        rim: '....x.......x...',
        sub: [
          r('F1 - ', 8),
          r('Db1 - ', 8),
          r('Bb0 - ', 8),
          r('C1 - ', 8),
        ].join(' ') + ' ' + [r('F1 - ', 8), r('Db1 - ', 8), r('Eb1 - ', 8), r('C1 - ', 8)].join(' '),
        pluck: [
          'F3 . Ab3 . C4 . Ab3 . F3 . Ab3 . Db4 . C4 .',
          'F3 . Ab3 . Db4 . Ab3 . F3 . Ab3 . F4 . Eb4 .',
          'F3 . Bb3 . Db4 . Bb3 . F3 . Bb3 . Db4 . C4 .',
          'E3 . G3 . C4 . G3 . E3 . G3 . Bb3 . G3 .',
        ].join(' '),
        pad: ['@Fm:3', '@Db:3', '@Bbm:3', '@C:3', '@Fm:3', '@Db:3', '@Eb:3', '@C:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// BOSS: Goldenface. Dramatic C minor.
// ---------------------------------------------------------------------------
const boss: SongDef = {
  id: 'boss',
  bpm: 156,
  instruments: {
    kick: { inst: 'kick', vol: 0.95 },
    snare: { inst: 'snare', vol: 0.65, send: 1 },
    hat: { inst: 'hat', vol: 0.4 },
    timp: { inst: 'timpani', vol: 0.8, send: 1 },
    bass: { inst: 'bass', vol: 0.8 },
    strings: { inst: 'strings', vol: 0.8, send: 1 },
    choir: { inst: 'choir', vol: 0.7, send: 1 },
    brass: { inst: 'brass', vol: 0.8, send: 1 },
    crash: { inst: 'crash', vol: 0.45, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        kick: 'x..x..x.x..x..x.',
        snare: '....X.......X...',
        hat: 'xxxxxxxxxxxxxxxx',
        crash: 'X...............' + r('................', 7),
        timp: 'C2 . . . . . . . G1 . . . . . . . ' + r('. . . . . . . . . . . . . . . .', 1) + ' Ab1 . . . . . . . Ab1 . . . . . . . ' + r('. . . . . . . . . . . . . . . .', 3) + ' G1 . G1 . G1 . G1 . G1 G1 G1 G1 G1 G1 G1 G1',
        bass: [r('C2 C2 C3 C2 ', 4), r('C2 C2 C3 C2 ', 4), r('Ab1 Ab1 Ab2 Ab1 ', 4), r('Ab1 Ab1 Ab2 Ab1 ', 4), r('F1 F1 F2 F1 ', 4), r('F1 F1 F2 F1 ', 4), r('G1 G1 G2 G1 ', 4), r('G1 G1 G2 G1 ', 4)].join(' '),
        strings: ['@Cm:3', '@Cm:3', '@Ab:3', '@Ab:3', '@Fm:3', '@Fm:3', '@G:3', '@G:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
        choir: ['@Cm:4', '@Ab:4', '@Fm:4', '@G:4'].map((c) => `${c} ${r('-', 31)}`).join(' '),
        brass: [
          'C4! - - - - - G4 - - - - - Eb4 - D4 -',
          'C4 - - - - - - - . . . . . . . .',
          'Ab4! - - - - - Eb4 - - - - - C4 - Bb3 -',
          'Ab3 - - - - - - - . . . . . . . .',
          'F4! - - - Ab4 - - - C5 - - - Bb4 - Ab4 -',
          'G4 - - - F4 - - - Eb4 - - - D4 - - -',
          'G4! - - - B4 - - - D5 - - - F5 - - -',
          'Eb5 - - - D5 - - - B4 - - - G4 - - -',
        ].join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// HOSPITAL: soap-opera organ.
// ---------------------------------------------------------------------------
const hospital: SongDef = {
  id: 'hospital',
  bpm: 72,
  instruments: {
    organ: { inst: 'organ', vol: 0.9, send: 1 },
    strings: { inst: 'strings', vol: 0.4, send: 1 },
  },
  sections: {
    A: {
      bars: 4,
      tracks: {
        organ: [
          '@Am:3 - - - - - - - - - - - E5 - D5 -',
          '@Dm:3 - - - - - - - F5 - - - E5 - D5 -',
          '@E7:3 - - - - - - - G#4 - - - B4 - D5 -',
          '@Am:3 - - - - - - - C5 - - - - - - -',
        ].join(' '),
        strings: ['A2', 'D2', 'E2', 'A2'].map((n) => `${n} ${r('-', 15)}`).join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// SAD: rain, memories, low points.
// ---------------------------------------------------------------------------
const sad: SongDef = {
  id: 'sad',
  bpm: 70,
  instruments: {
    piano: { inst: 'piano', vol: 0.8, send: 1 },
    strings: { inst: 'strings', vol: 0.5, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        piano: [
          'A2 E3 A3 C4 E4 C4 A3 E3 A2 E3 A3 C4 B3 - - -',
          'F2 C3 F3 A3 C4 A3 F3 C3 F2 C3 F3 A3 G3 - - -',
          'C3 G3 C4 E4 G4 E4 C4 G3 C3 G3 C4 E4 D4 - - -',
          'G2 D3 G3 B3 D4 B3 G3 D3 G2 D3 G3 B3 E4 - - -',
          'A2 E3 A3 C4 E4 C4 A3 E3 A2 E3 A3 C4 E4 - A4 -',
          'F2 C3 F3 A3 C4 A3 F3 C3 F2 C3 F3 A3 G4 - F4 -',
          'C3 G3 C4 E4 G4 E4 C4 G3 G2 D3 G3 B3 D4 - B3 -',
          'A2 E3 A3 C4 E4 - - - - - - - . . . .',
        ].join(' '),
        strings: ['@Am:3', '@F:3', '@C:3', '@G:3', '@Am:3', '@F:3', '@C:3', '@Am:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// DO THE SCARN: the dance number (non-looping, charted by the rhythm game).
// 116 bpm, A minor disco-funk.
// ---------------------------------------------------------------------------
const discoBass = (a: string, b: string) => `${a} - ${b} - ${a} - ${b} - ${a} - ${b} - ${a} - ${b} -`;
const scarnVerseBass = [discoBass('A1', 'A2'), discoBass('D2', 'D3'), discoBass('A1', 'A2'), discoBass('D2', 'D3')].join(' ');
const scarnChorusBass = [discoBass('F1', 'F2'), discoBass('G1', 'G2'), discoBass('E1', 'E2'), discoBass('A1', 'A2')].join(' ');
const hook = [
  'A4 . C5 . A4 . E5 - - . D5 . C5 . A4 .',
  'D5 - - . C5 . A4 . F#4 - - - . . . .',
  'A4 . C5 . A4 . E5 - - . G5 . E5 . D5 .',
  'C5 - - - A4 - - - . . . . . . . .',
].join(' ');
const chorusTop = [
  'C5! - - - A4 - C5 - D5! - - - B4 - D5 -',
  'B4! - - - G#4 - B4 - C5! - - - E5 - - -',
].join(' ');
const scarn: SongDef = {
  id: 'scarn',
  bpm: 116,
  loop: false,
  gain: 1.05,
  instruments: {
    kick: { inst: 'kick', vol: 1 },
    clap: { inst: 'clap', vol: 0.7, send: 1 },
    ohat: { inst: 'ohat', vol: 0.45 },
    hat: { inst: 'hat', vol: 0.35 },
    crash: { inst: 'crash', vol: 0.5, send: 1 },
    bass: { inst: 'bass', vol: 0.9 },
    stab: { inst: 'stab', vol: 0.75, send: 1 },
    lead: { inst: 'square', vol: 0.55, send: 1 },
    pad: { inst: 'synthpad', vol: 0.45, send: 1 },
    brass: { inst: 'brass', vol: 0.7, send: 1 },
  },
  sections: {
    intro: {
      bars: 4,
      tracks: {
        kick: 'x...x...x...x...',
        hat: '..x...x...x...x.',
        bass: scarnVerseBass,
        crash: 'X...............',
      },
    },
    verse: {
      bars: 8,
      tracks: {
        kick: 'x...x...x...x...',
        clap: '....x.......x...',
        ohat: '..x...x...x...x.',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: 'X...............',
        bass: scarnVerseBass,
        stab: r('. . . . . . @Am7:4 - . . . . . . @Am7:4 . . . . . . . @D9:3 - . . . . . . @D9:3 .', 4),
        lead: hook + ' ' + hook,
      },
    },
    chorus: {
      bars: 8,
      tracks: {
        kick: 'x...x...x...x...',
        clap: '....x.......x...',
        ohat: '..x...x...x...x.',
        hat: 'xxxxxxxxxxxxxxxx',
        crash: 'X...............' + r('................', 3) + 'X...............' + r('................', 3),
        bass: scarnChorusBass,
        pad: ['@F:3', '@G:3', '@E7:3', '@Am:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
        brass: chorusTop + ' ' + chorusTop,
        stab: r('@F:4 . . @F:4 . . . . . . . . . . . . @G:4 . . @G:4 . . . . . . . . . . . . @E7:4 . . @E7:4 . . . . . . . . . . . . @Am:4 . . @Am:4 . . . . . . . . . . . .', 2),
      },
    },
    bridge: {
      bars: 4,
      tracks: {
        kick: 'x.......x.......',
        clap: 'x.x.x.x.x.x.xxxx',
        bass: [discoBass('F1', 'F2'), discoBass('F1', 'F2'), discoBass('G1', 'G2'), 'G1 - G2 - G1 - G2 - G1 G2 G1 G2 G1 G2 G1 G2'].join(' '),
        pad: '@Fmaj7:3 ' + r('-', 31) + ' @G:3 ' + r('-', 31),
      },
    },
    outro: {
      bars: 2,
      tracks: {
        kick: 'X...............' + '................',
        crash: 'X...............',
        stab: '@Am:4! - - - - - - - - - - - - - - - ' + r('-', 16),
        brass: 'A4! - - - - - - - - - - - - - - - ' + r('-', 16),
      },
    },
  },
  order: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
};

// ---------------------------------------------------------------------------
// ARENA: All-Star hockey rock.
// ---------------------------------------------------------------------------
const arena: SongDef = {
  id: 'arena',
  bpm: 148,
  instruments: {
    kick: { inst: 'kick', vol: 0.95 },
    snare: { inst: 'snare', vol: 0.6, send: 1 },
    hat: { inst: 'hat', vol: 0.45 },
    crash: { inst: 'crash', vol: 0.4, send: 1 },
    gtr: { inst: 'guitar', vol: 0.75 },
    bass: { inst: 'bass', vol: 0.75 },
    organ: { inst: 'organ', vol: 0.6, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        kick: 'x.x...x.x.x...x.',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: 'X...............' + r('................', 7),
        gtr: [pc('D2'), pc('D2'), pc('G2'), pc('A2'), pc('B1'), pc('G2'), pc('A2'), pc('A2')].join(' '),
        bass: [pc('D2'), pc('D2'), pc('G1'), pc('A1'), pc('B1'), pc('G1'), pc('A1'), pc('A1')].join(' '),
        organ: [
          'D5 - F#5 - A5 - - - F#5 - A5 - - - . .',
          'D6 - - - A5 - - - F#5 - - - A5 - - -',
          'G5 - - - B5 - - - D6 - - - B5 - G5 -',
          'A5 - - - C#6 - - - E6 - - - - - - -',
          'B5 - - - F#5 - - - D5 - - - F#5 - B5 -',
          'G5 - - - D5 - - - B4 - - - D5 - G5 -',
          'A5 - - - E5 - - - C#5 - - - E5 - A5 -',
          'A5 - - - - - - - . . A5 . A5 . A5 .',
        ].join(' '),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// SUSPENSE: presidential fanfare that goes a bit shifty.
// ---------------------------------------------------------------------------
const suspense: SongDef = {
  id: 'suspense',
  bpm: 92,
  instruments: {
    snare: { inst: 'snare', vol: 0.45, send: 1 },
    kick: { inst: 'kick', vol: 0.6 },
    brass: { inst: 'brass', vol: 0.75, send: 1 },
    strings: { inst: 'strings', vol: 0.55, send: 1 },
    bass: { inst: 'bass', vol: 0.6 },
    pluck: { inst: 'pluck', vol: 0.4, send: 1 },
  },
  sections: {
    A: {
      bars: 8,
      tracks: {
        snare: 'x.xxx.x.x.xxx.x.',
        kick: 'x.......x.......',
        brass: [
          'Bb3 - - F4 - - Bb4 - - - - - D5 - C5 -',
          'Bb4 - - - - - - - F4 - - - . . . .',
          'Eb4 - - G4 - - Bb4 - - - - - Eb5 - D5 -',
          'C5 - - - - - - - . . . . . . . .',
          'Bb3 - - Db4 - - E4 - - - - - F4 - Gb4 -',
          'F4 - - - - - - - . . . . . . . .',
          'Eb4 - - D4 - - Db4 - - - - - C4 - - -',
          'F3 - - - - - - - . . . . . . . .',
        ].join(' '),
        strings: ['@Bb:3', '@Bb:3', '@Eb:3', '@F:3', '@Bbm:3', '@Bbm:3', '@Ebm:3', '@F7:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
        bass: [r('Bb1 - ', 8), r('Bb1 - ', 8), r('Eb2 - ', 8), r('F1 - ', 8), r('Bb1 - ', 8), r('A1 - ', 8), r('Ab1 - ', 8), r('F1 - ', 8)].join(' '),
        pluck: r('. . . . . . . . . . . . . . . . ', 4) + ' ' + r('F4 . . Gb4 . . F4 . E4 . . F4 . . . . ', 4),
      },
    },
  },
  order: ['A'],
};

// ---------------------------------------------------------------------------
// FINALE: the super shot. Melodrama into triumph.
// ---------------------------------------------------------------------------
const finale: SongDef = {
  id: 'finale',
  bpm: 84,
  instruments: {
    timp: { inst: 'timpani', vol: 0.8, send: 1 },
    strings: { inst: 'strings', vol: 0.85, send: 1 },
    choir: { inst: 'choir', vol: 0.8, send: 1 },
    brass: { inst: 'brass', vol: 0.85, send: 1 },
    bass: { inst: 'subbass', vol: 0.7 },
    snare: { inst: 'snare', vol: 0.4, send: 1 },
    crash: { inst: 'crash', vol: 0.5, send: 1 },
  },
  sections: {
    build: {
      bars: 4,
      tracks: {
        timp: 'C2 . . . . . . . C2 . . . . . . . C2 . . . . . . . C2 . C2 . C2 . C2 . Ab1 . . . . . . . Ab1 . . . . . . . Bb1 . . . Bb1 . . . Bb1 . Bb1 . Bb1 Bb1 Bb1 Bb1',
        strings: '@Cm:3 ' + r('-', 31) + ' @Ab:3 ' + r('-', 15) + ' @Bb:3 ' + r('-', 15),
        bass: 'C1 ' + r('-', 31) + ' Ab0 ' + r('-', 15) + ' Bb0 ' + r('-', 15),
        snare: '................' + '................' + '................' + 'x.x.x.x.xxxxXXXX',
      },
    },
    triumph: {
      bars: 8,
      tracks: {
        crash: 'X...............' + r('................', 3) + 'X...............' + r('................', 3),
        timp: 'C2 . . . . . . . G1 . . . . . . .',
        strings: ['@C:3', '@G:3', '@Am:3', '@F:3', '@C:3', '@G:3', '@F:3', '@C:3'].map((c) => `${c} ${r('-', 15)}`).join(' '),
        choir: ['@C:4', '@Am:4', '@C:4', '@F:4'].map((c) => `${c} ${r('-', 31)}`).join(' '),
        bass: ['C1', 'G0', 'A0', 'F0', 'C1', 'G0', 'F0', 'C1'].map((n) => `${n} ${r('-', 15)}`).join(' '),
        brass: [
          'C4! - - - G4 - - - C5 - - - - - D5 -',
          'B4 - - - G4 - - - D5 - - - - - - -',
          'C5! - - - A4 - - - E5 - - - D5 - C5 -',
          'A4 - - - - - - - F4 - - - A4 - C5 -',
          'E5! - - - D5 - - - C5 - - - G4 - - -',
          'D5 - - - B4 - - - G4 - - - B4 - D5 -',
          'F5! - - - E5 - - - D5 - - - A4 - C5 -',
          'C5! - - - - - - - - - - - - - - -',
        ].join(' '),
      },
    },
  },
  order: ['build', 'triumph'],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// Stingers (one-shots over the current mix).
// ---------------------------------------------------------------------------
const dun: SongDef = {
  id: 'dun',
  bpm: 90,
  loop: false,
  instruments: { brass: { inst: 'brass', vol: 1, send: 1 }, timp: { inst: 'timpani', vol: 1, send: 1 }, strings: { inst: 'strings', vol: 0.8, send: 1 } },
  sections: {
    A: {
      bars: 2,
      tracks: {
        brass: '@Dm:3! - - . @Dm:3! - - . @C#dim:3! - - - - - - - - - - - - - - - - - - - - - - - - -',
        timp: 'D2 . . . D2 . . . A1 . . . . . . .',
        strings: '. . . . . . . . @C#dim7:3 - - - - - - - - - - - - - - - - - - - - - - -',
      },
    },
  },
  order: ['A'],
};
const title: SongDef = {
  id: 'title',
  bpm: 100,
  loop: false,
  instruments: {
    brass: { inst: 'brass', vol: 1, send: 1 },
    timp: { inst: 'timpani', vol: 1, send: 1 },
    crash: { inst: 'crash', vol: 0.8, send: 1 },
    choir: { inst: 'choir', vol: 0.8, send: 1 },
  },
  sections: {
    A: {
      bars: 1,
      tracks: { brass: '@Am:3! - - - - - - - - - - - - - - -', timp: 'A1 . . . . . . . . . . . . . . .', crash: 'X...............', choir: '@Am:4 - - - - - - - - - - - - - - -' },
    },
  },
  order: ['A'],
};
const fail: SongDef = {
  id: 'fail',
  bpm: 100,
  loop: false,
  instruments: { brass: { inst: 'brass', vol: 0.9 } },
  sections: { A: { bars: 2, tracks: { brass: 'G3 - - . F#3 - - . F3 - - . E3 - - - - - - - - - - - . . . . . . . .' } } },
  order: ['A'],
};
const victory: SongDef = {
  id: 'victory',
  bpm: 132,
  loop: false,
  instruments: { brass: { inst: 'brass', vol: 1, send: 1 }, crash: { inst: 'crash', vol: 0.6, send: 1 }, timp: { inst: 'timpani', vol: 0.8 } },
  sections: {
    A: {
      bars: 2,
      tracks: {
        brass: 'C4 . E4 . G4 . C5! - - - G4 . C5! - - - ' + '@C:4! - - - - - - - - - - - - - - -',
        crash: '................X...............',
        timp: 'C2 . C2 . G1 . C2 . . . . . . . . . C2 . . . . . . . . . . . . . . .',
      },
    },
  },
  order: ['A'],
};
const ghost: SongDef = {
  id: 'ghost',
  bpm: 60,
  loop: false,
  instruments: { choir: { inst: 'choir', vol: 1, send: 1 }, bell: { inst: 'bell', vol: 0.7, send: 1 } },
  sections: {
    A: {
      bars: 2,
      tracks: { choir: '@Fmaj7:4 ' + r('-', 31), bell: 'C6 . . . A5 . . . F5 . . . E5 . . . C6 . . . . . . . . . . . . . . .' },
    },
  },
  order: ['A'],
};
const romance: SongDef = {
  id: 'romance',
  bpm: 64,
  loop: false,
  instruments: { strings: { inst: 'strings', vol: 0.9, send: 1 }, vibes: { inst: 'vibes', vol: 0.8, send: 1 } },
  sections: {
    A: {
      bars: 2,
      tracks: {
        strings: '@Fmaj7:3 ' + r('-', 15) + ' @Em7:3 ' + r('-', 15),
        vibes: 'A5 - - - G5 - - - F5 - - - E5 - - - D5 - - - E5 - - - C5 - - - - - - -',
      },
    },
  },
  order: ['A'],
};

export const SONGS: Record<string, SongDef> = {
  spy,
  action,
  manor,
  montage,
  tryout,
  jazz,
  jasmine,
  stealth,
  boss,
  hospital,
  sad,
  scarn,
  arena,
  suspense,
  finale,
  dun,
  title,
  fail,
  victory,
  ghost,
  romance,
};
