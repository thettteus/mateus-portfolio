'use client';

import { useEffect, useState } from 'react';

const WORDS = ['Product', 'Architecture', 'Engineering', 'Data', 'AI'];

export default function Marquee() {
  const [held, setHeld] = useState(false);

  const copy = (key: string) => (
    <div className="mq-copy" key={key}>
      {WORDS.map(word => (
        <span className="mq-item" key={word}>
          {word}
          <i className="mq-dot" />
        </span>
      ))}
    </div>
  );

  /* Release is watched on the window, not just the band: a pointer that comes
     up outside it — dragged past the edge, or interrupted by a system gesture
     — fires nothing on the element itself, and the band would stay paused. */
  useEffect(() => {
    if (!held) return;
    const release = () => setHeld(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [held]);

  // press-and-hold pauses the scroll and lights the band accent; release resumes.
  // pointer events cover mouse + touch, so it works the same on mobile.
  return (
    <div
      className={`marquee${held ? ' is-held' : ''}`}
      aria-hidden="true"
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
    >
      <div className="mq-track">{copy('a')}{copy('b')}</div>
    </div>
  );
}
