import { useSyncExternalStore } from 'react';
import { captions } from '../game/systems/dialogue';
import { settings } from '@shared/state/settings';

/** Bottom-of-screen captions: speaker, the coworker playing them, and the line. */
export function Captions() {
  const { caption } = useSyncExternalStore(captions.subscribe, captions.get);
  const s = useSyncExternalStore(settings.subscribe, settings.get);
  if (!caption || !s.subtitles) return null;
  return (
    <div className={`captions ${s.textSize === 'large' ? 'large' : ''} style-${caption.style}`} key={caption.id}>
      <div className="who" style={{ color: caption.color }}>
        {caption.name}
        {caption.actor && <span> · played by {caption.actor}</span>}
      </div>
      <div className="line">{caption.text}</div>
    </div>
  );
}
