import { useEffect, useRef } from 'react';
import { useUI } from './components/hooks';
import { BootScreen, MainMenu, ChapterSelect, Achievements } from './components/Menus';
import { Settings } from './components/Settings';
import { GameUI } from './components/GameUI';
import { Credits, Stats } from './components/Ending';
import { Director } from './game/Director';
import { ui } from './state/ui';
import { unlockAll } from './state/save';
import { installDebug } from './debug';

export default function App() {
  const screen = useUI((s) => s.screen);
  const inGame = useUI((s) => s.inGame);
  const paused = useUI((s) => s.paused);
  const touchLayout = useUI((s) => s.touchLayout);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    ui.set({ loading: 'LOADING PROJECTOR…' });
    const params = new URLSearchParams(window.location.search);
    if (params.get('unlock') === 'all') unlockAll();
    void Director.boot(hostRef.current).then(() => {
      ui.set({ loading: null });
      installDebug();
    });
    const fs = () => ui.set({ fullscreen: !!document.fullscreenElement });
    document.addEventListener('fullscreenchange', fs);
    return () => document.removeEventListener('fullscreenchange', fs);
  }, []);

  const showGameUI = inGame && (screen === 'game' || (screen === 'settings' && paused));
  const hideCursor = screen === 'game' && !paused && touchLayout === 'action';

  return (
    <div className="app">
      <div className={`stage ${hideCursor ? 'hide-cursor' : ''}`}>
        <div id="game" ref={hostRef} />
        {showGameUI && screen === 'game' && <GameUI />}
        <div className="layer">
          {screen === 'boot' && <BootScreen />}
          {screen === 'menu' && <MainMenu />}
          {screen === 'chapters' && <ChapterSelect />}
          {screen === 'settings' && <Settings />}
          {screen === 'achievements' && <Achievements />}
          {screen === 'credits' && <Credits />}
          {screen === 'stats' && <Stats />}
        </div>
      </div>
      <div className="rotate">
        <div>
          <div style={{ fontSize: '12vw' }}>⟳</div>
          Rotate your device to landscape to watch THREAT LEVEL MIDNIGHT.
        </div>
      </div>
    </div>
  );
}
