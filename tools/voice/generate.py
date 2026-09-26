#!/usr/bin/env python3
"""
Offline voice generation for Threat Level Midnight.

  npm run voice:export      # writes tools/voice/lines.json
  npm run voice:generate    # renders public/voice/<id>.mp3 + manifest.json

Uses Kokoro-82M (Apache-2.0) via kokoro-onnx. The voices are generic synthetic
voices; nothing is cloned from or modelled on any actor. Per-character effects
(villain reverb, radio band-pass, robot comb filter, ghost echo...) are applied
with ffmpeg. Unchanged lines are skipped using a content hash.

Requires: pip install kokoro-onnx soundfile ; ffmpeg ;
model files kokoro-v1.0.onnx + voices-v1.0.bin (set KOKORO_DIR).
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'voice')
MODEL_DIR = os.environ.get('KOKORO_DIR', os.path.join(HERE, '.cache'))

FX = {
    'none': 'acompressor=threshold=-18dB:ratio=3:attack=5:release=80',
    'villain': 'bass=g=5,aecho=0.8:0.6:45|90:0.22|0.12,acompressor=threshold=-18dB:ratio=3',
    'robot': 'aecho=0.8:0.85:7:0.45,highpass=f=180,acompressor=threshold=-18dB:ratio=3',
    'ghost': 'aecho=0.8:0.8:320|640|960:0.4|0.25|0.15,chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,lowpass=f=6500',
    'radio': 'highpass=f=320,lowpass=f=3200,acompressor=threshold=-24dB:ratio=6,volume=1.6',
    'tv': 'highpass=f=180,lowpass=f=5200,acompressor=threshold=-20dB:ratio=4,volume=1.3',
    'phone': 'highpass=f=350,lowpass=f=3000,acompressor=threshold=-24dB:ratio=6,volume=1.7',
    'dream': 'aecho=0.8:0.75:70|140:0.3|0.2,lowpass=f=7000,acompressor=threshold=-18dB:ratio=3',
    'narrator': 'bass=g=3,acompressor=threshold=-20dB:ratio=3,aecho=0.8:0.4:25:0.08',
    'room': 'aecho=0.8:0.35:18|34:0.12|0.07,acompressor=threshold=-18dB:ratio=3',
}

# Lines that need special processing beyond a voice effect.
SPECIAL = {
    # Jasmine's coded message: recorded backwards and slowed down on "tape".
    # In-game, REVERSE + speed x1.25 restores it.
    'ch05_secret': 'areverse,asetrate=24000*0.8,aresample=24000,aecho=0.8:0.5:60:0.2',
}


def h(line):
    s = f"{line['text']}|{line['voice']}|{line['speed']}|{line['fx']}|{line.get('pitch', 0)}|{line.get('eq', '')}|{SPECIAL.get(line['id'], '')}|v4"
    return hashlib.sha1(s.encode()).hexdigest()[:12]


def style_for(k, spec, cache={}):
    """A voice id, or a blend "am_michael:0.65+am_puck:0.35" of Kokoro style vectors."""
    if spec in cache:
        return cache[spec]
    if '+' not in spec and ':' not in spec:
        cache[spec] = spec
        return spec
    total = None
    wsum = 0.0
    for part in spec.split('+'):
        name, _, w = part.partition(':')
        w = float(w or 1)
        v = k.get_voice_style(name) * w
        total = v if total is None else total + v
        wsum += w
    cache[spec] = (total / wsum).astype('float32')
    return cache[spec]


def pitch_filter(semitones):
    """Shift pitch without changing duration (resample, then undo the tempo change)."""
    if not semitones:
        return ''
    r = 2 ** (semitones / 12)
    tempo = 1 / r
    chain = [f'asetrate=24000*{r:.5f}', 'aresample=24000']
    while tempo < 0.5:
        chain.append('atempo=0.5')
        tempo /= 0.5
    while tempo > 2.0:
        chain.append('atempo=2.0')
        tempo /= 2.0
    chain.append(f'atempo={tempo:.5f}')
    return ','.join(chain)


def main():
    lines = json.load(open(os.path.join(HERE, 'lines.json')))
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(OUT, 'manifest.json')
    hash_path = os.path.join(HERE, 'hashes.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
    hashes = json.load(open(hash_path)) if os.path.exists(hash_path) else {}
    todo = [l for l in lines if hashes.get(l['id']) != h(l) or not os.path.exists(os.path.join(OUT, l['id'] + '.mp3'))]
    only = set(sys.argv[1:])
    if only:
        todo = [l for l in todo if any(l['id'].startswith(o) for o in only)]
    print(f'{len(lines)} lines, {len(todo)} to render')
    if todo:
        from kokoro_onnx import Kokoro
        k = Kokoro(os.path.join(MODEL_DIR, 'kokoro-v1.0.onnx'), os.path.join(MODEL_DIR, 'voices-v1.0.bin'))
    for i, l in enumerate(todo):
        samples, sr = k.create(l['text'], voice=style_for(k, l['voice']), speed=float(l['speed']), lang='en-us')
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, samples, sr)
            wav = tmp.name
        af = SPECIAL.get(l['id'], FX.get(l['fx'], FX['none']))
        if l['id'] in SPECIAL:
            af = af + ',' + FX['none']
        # character voice shaping first (pitch + timbre), then the scene effect
        shape = ','.join(x for x in (pitch_filter(float(l.get('pitch', 0))), l.get('eq', '')) if x)
        if shape and l['id'] not in SPECIAL:
            af = shape + ',' + af
        dst = os.path.join(OUT, l['id'] + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', af + ',loudnorm=I=-17:TP=-2:LRA=9', '-ac', '1', '-ar', '24000', '-b:a', '40k', dst], check=True)
        os.unlink(wav)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout.strip() or 0)
        manifest[l['id']] = int(dur * 1000)
        hashes[l['id']] = h(l)
        if i % 10 == 0 or i == len(todo) - 1:
            print(f'  [{i + 1}/{len(todo)}] {l["id"]} {dur:.1f}s')
            json.dump(manifest, open(man_path, 'w'), indent=0, sort_keys=True)
            json.dump(hashes, open(hash_path, 'w'), indent=0, sort_keys=True)
    # drop stale entries
    valid = {l['id'] for l in lines}
    for key in list(manifest):
        if key not in valid:
            manifest.pop(key)
            hashes.pop(key, None)
            p = os.path.join(OUT, key + '.mp3')
            if os.path.exists(p):
                os.unlink(p)
    json.dump(manifest, open(man_path, 'w'), indent=0, sort_keys=True)
    json.dump(hashes, open(hash_path, 'w'), indent=0, sort_keys=True)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.mp3'))
    print(f'done. {len(manifest)} files, {total / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
