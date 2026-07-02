'use client';

import { useEffect, useState } from 'react';
import { LAUNCH_DATE } from '@shared/tokens';

function diff(target: number) {
  const now = Date.now();
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const mins = Math.floor(s / 60);
  const secs = s - mins * 60;
  return { days, hours, mins, secs };
}

export default function Countdown() {
  const target = new Date(LAUNCH_DATE).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: Array<[number, string]> = [
    [t.days, 'Days'],
    [t.hours, 'Hrs'],
    [t.mins, 'Min'],
    [t.secs, 'Sec'],
  ];

  return (
    <div className="countdown">
      <div className="countdown__label">◷ Grand Theft Auto VI — launch countdown</div>
      <div className="countdown__grid">
        {cells.map(([n, u]) => (
          <div className="cd-cell" key={u}>
            <div className="n">{String(n).padStart(2, '0')}</div>
            <div className="u">{u}</div>
          </div>
        ))}
      </div>
      <div className="countdown__meta">Thursday 19 November 2026 · PS5 &amp; Xbox Series X|S</div>
    </div>
  );
}
