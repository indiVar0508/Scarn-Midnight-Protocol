import { useEffect, useRef, useState } from 'react';
import { useSave, useMenuNav } from './hooks';
import { goScreen, ui } from '../state/ui';
import { accuracy, confidenceLevel, formatTime, scarnRating } from '../state/stats';
import { unlockAchievement } from '../state/save';
import { DISCLAIMER } from './Menus';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { CAST } from '../data/cast';
import { CH11 } from '../data/script/ch11';
import { portraitFor } from '../game/art/portraits';

/** Credits, then (after the movie itself) the full cut's post-credits scene, then stats. */
export function Credits() {
  const [post, setPost] = useState(false);
  const after = ui.get().creditsNext;
  if (post) return <PostCredits onDone={() => goScreen(after)} />;
  return <CreditsRoll onDone={() => (after === 'stats' ? setPost(true) : goScreen(after))} />;
}

const POST = [CH11.pc1, CH11.pc2, CH11.pc3, CH11.pc4, CH11.pc5, CH11.pc6, CH11.pc7, CH11.pc8, CH11.pc9];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Scarn and Samuel pop back in after the credits, Ferris Bueller style. It goes on a bit too long. */
function PostCredits({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(-1);
  const [noon, setNoon] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useMenuNav({ count: 1, index: 0, setIndex: () => undefined, onSelect: () => done.current(), onBack: () => done.current() });
  useEffect(() => {
    let alive = true;
    void (async () => {
      await sleep(900);
      for (let k = 0; k < POST.length && alive; k++) {
        setI(k);
        const t0 = performance.now();
        await voice.play(POST[k].id);
        const minMs = Math.max(1500, POST[k].text.length * 55);
        const left = minMs - (performance.now() - t0);
        if (left > 0) await sleep(left);
        if (POST[k].id === CH11.pc6.id && alive) {
          setNoon(true);
          sfx('stamp');
        }
        await sleep(250);
      }
      await sleep(1200);
      if (alive) done.current();
    })();
    return () => {
      alive = false;
      voice.stop();
    };
  }, []);
  const line = i >= 0 ? POST[i] : null;
  const who = line ? CAST[line.who] : null;
  return (
    <div className="fill postcredits" onClick={() => done.current()}>
      {line && who && (
        <div key={i} className={`pc-actor ${line.who === 'scarn' ? 'left' : 'right'}`}>
          {who.portrait && <img src={portraitFor(who.portrait, who.color) ?? undefined} alt="" />}
          <div className="pc-line">
            <b style={{ color: who.color }}>{who.name}</b>
            <span>{line.text}</span>
          </div>
        </div>
      )}
      {noon && <div className="pc-noon">THREAT LEVEL: NOON</div>}
      <div className="corner-actions">
        <button className="chip" onClick={() => done.current()}>
          SKIP ▶▶
        </button>
      </div>
    </div>
  );
}

function CreditsRoll({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  const next = () => done.current();
  useMenuNav({ count: 1, index: 0, setIndex: () => undefined, onSelect: next, onBack: next });
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), 64000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="fill credits">
      <div className="roll" style={{ ['--dur' as string]: '62s' }}>
        <p className="vhs-title big">THREAT LEVEL</p>
        <p className="vhs-title big gold">MIDNIGHT</p>
        <h3>WRITTEN BY</h3>
        <p>Michael Scott</p>
        <h3>DIRECTED BY</h3>
        <p>Michael Scott</p>
        <h3>PRODUCED BY</h3>
        <p>Michael Scott</p>
        <h3>STARRING</h3>
        <p>Michael Scott as Agent Michael Scarn</p>
        <h3>ALSO STARRING</h3>
        <p>Dwight K. Schrute as Samuel L. Chang (a butler, not a robot)</p>
        <p>Jim Halpert as Goldenface</p>
        <p>Darryl Philbin as President Jackson</p>
        <p>Creed Bratton as Cherokee Jack (and his ghost)</p>
        <p>Jan Levinson as Jasmine Windsong</p>
        <p>Andy Bernard as Billy</p>
        <p>Pam Halpert as the Nacho Lady · Kevin Malone as the Hot Dog Guy</p>
        <p>Toby Flenderson as the Hostage (the most expensive shot in the movie)</p>
        <p>Helene Beesly as the Nurse · Kelly Kapoor as a Bachelorette</p>
        <h3>NARRATED BY</h3>
        <p>Stanley Hudson (paid in pretzels)</p>
        <h3>STUNTS</h3>
        <p>Michael Scott · Michael Scott&apos;s stunt double (Michael Scott)</p>
        <h3>CATERING</h3>
        <p>Kevin&apos;s Famous Chili (spilled)</p>
        <h3>SPECIAL EFFECTS</h3>
        <p>Glitter · Cotton balls · A desk fan · One (1) fog machine</p>
        <h3>NO ANIMALS WERE HARMED</h3>
        <p>One fax machine was mildly inconvenienced</p>
        <h3>— THE ACTUAL GAME —</h3>
        <p>Design, code, art, music, sound and voice direction</p>
        <p>built with Claude (Anthropic) for this fan project</p>
        <h3>TECH</h3>
        <p>React · TypeScript · Vite · Phaser 4 · Web Audio API</p>
        <h3>VOICES</h3>
        <p>Synthetic voices generated with Kokoro-82M (Apache-2.0), cast and tuned for each character&apos;s energy</p>
        <small>No recordings of any actor were sampled or cloned.</small>
        <h3>MUSIC &amp; SOUND</h3>
        <p>Original compositions synthesized in real time with the Web Audio API</p>
        <h3>ART</h3>
        <p>All characters, props and sets drawn procedurally in code</p>
        <h3>FONTS</h3>
        <p>Bebas Neue · Barlow Condensed · VT323 · Playfair Display · Special Elite (SIL OFL, Google Fonts)</p>
        <h3>INSPIRED BY</h3>
        <p>&quot;Threat Level Midnight&quot;, The Office (US), Season 7</p>
        <small>{DISCLAIMER}</small>
        <h3>THANK YOU</h3>
        <p>To everyone who stayed for the whole thing. Michael noticed.</p>
        <p className="vhs-title big" style={{ marginTop: '12cqw' }}>
          THE END
        </p>
        <p className="osd">(…OR IS IT?)</p>
      </div>
      <div className="corner-actions">
        <button className="chip" onClick={next}>
          SKIP ▶▶
        </button>
      </div>
    </div>
  );
}

export function Stats() {
  const s = useSave();
  const st = s.stats;
  const rating = scarnRating(st);
  useEffect(() => {
    music.stinger('victory');
    sfx('applause');
    if (rating.grade === 'S+++') unlockAchievement('worlds_best');
  }, [rating.grade]);
  const done = () => goScreen('menu');
  useMenuNav({ count: 1, index: 0, setIndex: () => undefined, onSelect: done, onBack: done });
  const hockey = `${st.goals} G · ${st.checks} CHK · ${st.steals} STL`;
  return (
    <div className="fill stats">
      <div>
        <h2 className="vhs-title">MISSION REPORT</h2>
        <table>
          <tbody>
            <tr>
              <td>Mission time</td>
              <td>{formatTime(st.playMs)}</td>
            </tr>
            <tr>
              <td>Shots fired</td>
              <td>{st.shotsFired}</td>
            </tr>
            <tr>
              <td>Accuracy</td>
              <td>{accuracy(st)}%</td>
            </tr>
            <tr>
              <td>Hockey performance</td>
              <td>{hockey}</td>
            </tr>
            <tr>
              <td>Training grade</td>
              <td>{Math.round(st.trainingScore)}%</td>
            </tr>
            <tr>
              <td>Dance accuracy</td>
              <td>{Math.round(st.danceAccuracy)}%</td>
            </tr>
            <tr>
              <td>Enemies defeated</td>
              <td>{st.enemiesDefeated}</td>
            </tr>
            <tr>
              <td>Dramatic poses</td>
              <td>{st.dramaticPoses}</td>
            </tr>
            <tr>
              <td>Confidence level</td>
              <td>{confidenceLevel(st)}</td>
            </tr>
            <tr>
              <td>Beets found</td>
              <td>{st.beetsFound} / 5</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="rating">
        <div className="osd" style={{ fontSize: '2cqw' }}>
          SCARN RATING
        </div>
        <div className="grade">{rating.grade}</div>
        <div className="rt gold">{rating.title}</div>
        <p>{rating.comment}</p>
        <p style={{ fontSize: '1.2cqw', color: '#999' }}>Rating system designed by Michael Scott. Peer-reviewed by Michael Scott.</p>
        <div style={{ display: 'flex', gap: '1cqw', justifyContent: 'center', marginTop: '1cqw' }}>
          <button className="chip" onClick={() => ui.set({ screen: 'credits', creditsNext: 'stats' })}>
            CREDITS
          </button>
          <button className="chip primary" onClick={done}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
