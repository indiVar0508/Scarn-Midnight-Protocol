import { useEffect } from 'react';
import { useSave, useMenuNav } from './hooks';
import { goScreen, ui } from '../state/ui';
import { accuracy, confidenceLevel, formatTime, scarnRating } from '../state/stats';
import { unlockAchievement } from '../state/save';
import { DISCLAIMER } from './Menus';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';

export function Credits() {
  const next = () => goScreen(ui.get().creditsNext);
  useMenuNav({ count: 1, index: 0, setIndex: () => undefined, onSelect: next, onBack: next });
  useEffect(() => {
    const t = window.setTimeout(next, 64000);
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
        <p>A man with a golden face · A very advanced butler · The President (allegedly)</p>
        <p>Cherokee Jack (and his ghost) · Jasmine Windsong · Billy</p>
        <h3>HOSTAGE #3</h3>
        <p>Himself</p>
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
        <p>Synthetic voices generated with Kokoro-82M (Apache-2.0)</p>
        <small>Generic synthetic voices; no actor voices were sampled, cloned or imitated.</small>
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
