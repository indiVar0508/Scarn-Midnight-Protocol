import { useState } from 'react';
import { useMenuNav, useSave, useUI } from './hooks';
import { ui, goScreen } from '../state/ui';
import { hasProgress, newGame, isChapterUnlocked } from '../state/save';
import { CHAPTERS } from '../data/chapters';
import { ACHIEVEMENTS } from '../data/achievements';
import { Director } from '../game/Director';
import { audio } from '../audio/engine';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';

export const DISCLAIMER =
  'Unofficial, non-commercial fan project. The Office and "Threat Level Midnight" belong to their respective rights holders (NBCUniversal). All art, music, sound and voices here are original; no footage, audio or likenesses from the show are used.';

export function BootScreen() {
  const loading = useUI((s) => s.loading);
  const start = () => {
    audio.init();
    audio.resume();
    void voice.loadManifest();
    sfx('vhs');
    music.play('spy', { fade: 1.2 });
    goScreen('menu');
  };
  return (
    <div
      className="fill boot"
      role="button"
      tabIndex={0}
      aria-label="Insert tape to start"
      onClick={start}
      onKeyDown={(e) => {
        if (e.code === 'Tab') return;
        start();
      }}
      ref={(el) => el?.focus()}
    >
      <div>
        <div className="warn">
          <b>WARNING</b>
          This motion picture is the property of Michael Scott. Unauthorized duplication, exhibition or laughing at the wrong parts is punishable by
          being uninvited from the premiere.
        </div>
        <div className="tape" aria-hidden="true">
          <div className="label">THREAT LEVEL MIDNIGHT — FINAL CUT (v11)</div>
          <div className="window">
            <div className="reel" />
            <div className="reel" />
          </div>
        </div>
        <div className="osd blink" style={{ fontSize: '3cqw' }}>
          {loading ?? 'CLICK OR PRESS ANY KEY TO INSERT TAPE'}
        </div>
        <div style={{ color: '#666', fontSize: '1.2cqw', marginTop: '1.4cqw' }}>Be kind. Rewind. · Headphones recommended · Best on desktop</div>
      </div>
    </div>
  );
}

export function MainMenu() {
  const s = useSave();
  const progress = hasProgress();
  const items: { label: string; act: () => void; disabled?: boolean; note?: string }[] = [];
  if (progress) {
    const ch = CHAPTERS[Math.min(CHAPTERS.length - 1, s.chapter - 1)];
    items.push({ label: 'CONTINUE', act: () => Director.continueGame(), note: `CH.${ch.id} · ${ch.title.toUpperCase()}` });
  }
  items.push({
    label: progress ? 'PLAY MOVIE (FROM THE TOP)' : 'PLAY MOVIE',
    act: () => {
      newGame(1);
      void Director.startChapter(1);
    },
  });
  items.push({ label: 'CHAPTER SELECT', act: () => goScreen('chapters'), disabled: s.reached <= 1 && !s.completed });
  items.push({ label: 'SETTINGS', act: () => ui.set({ screen: 'settings', settingsReturn: 'menu' }) });
  items.push({ label: 'ACHIEVEMENTS', act: () => goScreen('achievements') });
  items.push({ label: 'CREDITS', act: () => ui.set({ screen: 'credits', creditsNext: 'menu' }) });
  const [idx, setIdx] = useState(0);
  const select = (i: number) => {
    const it = items[i];
    if (!it || it.disabled) {
      sfx('ui_back');
      return;
    }
    sfx('ui_select');
    it.act();
  };
  useMenuNav({ count: items.length, index: idx, setIndex: setIdx, onSelect: select });
  return (
    <div className="fill menu">
      <div className="title-block">
        <div className="vhs-title title">
          THREAT LEVEL
          <br />
          <span className="line2">MIDNIGHT</span>
        </div>
        <div className="subtitle">A MICHAEL SCARN ADVENTURE</div>
      </div>
      <nav aria-label="Main menu">
        {items.map((it, i) => (
          <div key={it.label}>
            <button className={`btn ${i === idx ? 'active' : ''}`} disabled={it.disabled} onMouseEnter={() => setIdx(i)} onClick={() => select(i)}>
              {it.label}
            </button>
            {it.note && i === idx && <div className="progress-pill">{it.note}</div>}
          </div>
        ))}
      </nav>
      <div className="footer">
        <p>{DISCLAIMER}</p>
        <p className="osd" style={{ fontSize: '1.5cqw' }}>
          SP ▶ 00:{String(new Date().getMinutes()).padStart(2, '0')}:00
        </p>
      </div>
    </div>
  );
}

export function ChapterSelect() {
  useSave();
  const [idx, setIdx] = useState(0);
  const pick = (i: number) => {
    const ch = CHAPTERS[i];
    if (!isChapterUnlocked(ch.id)) {
      sfx('ui_back');
      return;
    }
    sfx('ui_select');
    newGame(ch.id);
    void Director.startChapter(ch.id);
  };
  useMenuNav({ count: CHAPTERS.length, index: idx, setIndex: setIdx, onSelect: pick, onBack: () => goScreen('menu'), columns: 4 });
  return (
    <div className="panel" role="dialog" aria-label="Chapter select">
      <header>
        <h2>CHAPTER SELECT</h2>
        <span className="osd" style={{ fontSize: '1.6cqw' }}>
          Chapters unlock as you reach them. Finish the movie to unlock everything.
        </span>
      </header>
      <div className="body">
        <div className="chapters">
          {CHAPTERS.map((ch, i) => {
            const locked = !isChapterUnlocked(ch.id);
            return (
              <button
                key={ch.id}
                className={`chapter-card ${locked ? 'locked' : ''} ${i === idx ? 'active' : ''}`}
                onMouseEnter={() => setIdx(i)}
                onClick={() => pick(i)}
                aria-disabled={locked}
              >
                <div className="num">{String(ch.id).padStart(2, '0')}</div>
                <div className="name">{ch.title}</div>
                <div className="blurb">{locked ? '???' : ch.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>
      <footer>
        <button className="chip" onClick={() => goScreen('menu')}>
          BACK
        </button>
      </footer>
    </div>
  );
}

export function Achievements() {
  const s = useSave();
  useMenuNav({ count: 1, index: 0, setIndex: () => undefined, onSelect: () => goScreen('menu'), onBack: () => goScreen('menu') });
  return (
    <div className="panel" role="dialog" aria-label="Achievements">
      <header>
        <h2>ACHIEVEMENTS</h2>
        <span className="osd" style={{ fontSize: '1.8cqw' }}>
          {s.achievements.length} / {ACHIEVEMENTS.length}
        </span>
      </header>
      <div className="body">
        <div className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const got = s.achievements.includes(a.id);
            return (
              <div className={`ach ${got ? 'got' : ''}`} key={a.id}>
                <div className="medal">{got ? '★' : '?'}</div>
                <div>
                  <b>{got || !a.hidden ? a.title : 'HIDDEN'}</b>
                  <span>{got || !a.hidden ? a.desc : 'Keep your eyes open. And your beets closer.'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <footer>
        <button className="chip" onClick={() => goScreen('menu')}>
          BACK
        </button>
      </footer>
    </div>
  );
}
