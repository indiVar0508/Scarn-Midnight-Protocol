#!/usr/bin/env python3
"""
Render voice-casting candidates so they can be compared by ear in the v2 audition page
(http://localhost:5174/?voices).

  KOKORO_DIR=~/.cache/kokoro FFMPEG=~/.cache/kokoro/bin/ffmpeg \\
    ~/.cache/kokoro/venv/bin/python tools/voice/audition.py [character ...]

Reads tools/voice/audition.json, writes public/voice-audition/<character>-<n>.mp3 plus
index.json. Same Kokoro + ffmpeg chain as generate.py, so a pick drops straight into
src/data/cast.ts. Stock Kokoro voices only; nothing is cloned from a recording.
"""
import json
import os
import sys
import tempfile

import soundfile as sf

from generate import FX, MODEL_DIR, ROOT, pitch_filter, render, style_for

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'public', 'voice-audition')


def main():
    spec = json.load(open(os.path.join(HERE, 'audition.json')))
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(MODEL_DIR, 'kokoro-v1.0.onnx'), os.path.join(MODEL_DIR, 'voices-v1.0.bin'))
    index = {}
    for who, c in spec.items():
        if who.startswith('_') or (only and who not in only):
            continue
        entries = []
        for n, cand in enumerate(c['candidates']):
            samples, sr = k.create(c['line'], voice=style_for(k, cand['voice']), speed=float(cand['speed']), lang='en-us')
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                sf.write(tmp.name, samples, sr)
                wav = tmp.name
            shape = ','.join(x for x in (pitch_filter(float(cand.get('pitch', 0))), cand.get('eq', '')) if x)
            af = FX.get(c.get('fx', 'none'), FX['none'])
            if shape:
                af = shape + ',' + af
            name = f'{who}-{n}.mp3'
            dur = render(wav, af, os.path.join(OUT, name))
            entries.append({**cand, 'file': f'/voice-audition/{name}', 'ms': int(dur * 1000)})
            print(f'  {who} {chr(65 + n)}: {cand["voice"]} speed {cand["speed"]} pitch {cand.get("pitch", 0)} ({dur:.1f}s)')
        index[who] = {'who': c['who'], 'direction': c['direction'], 'line': c['line'], 'candidates': entries}
    path = os.path.join(OUT, 'index.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    old.update(index)
    json.dump(old, open(path, 'w'), indent=1)
    print(f'wrote {path}')


if __name__ == '__main__':
    main()
