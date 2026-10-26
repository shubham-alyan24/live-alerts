import React from 'react';
import { formatClock, formatWhen } from '../lib/time';

const HOUR = 3600 * 1000;
const MAX_ROWS = 6;

// "Until when", at a glance: one bar per alert on a shared time axis with a NOW line.
// Bars with no announced end fade out (dashed) instead of inventing an end time.
export default function Timeline({ alerts, now, tz }) {
  const rows = alerts.slice(0, MAX_ROWS);
  if (!rows.length) return null;

  const t0 = Math.min(now.getTime() - 2 * HOUR, ...rows.map((a) => a.onset?.getTime() ?? now.getTime()));
  const start = Math.max(t0, now.getTime() - 12 * HOUR);
  const lastEnd = Math.max(...rows.map((a) => (a.ends || a.expires || now).getTime()));
  const end = Math.min(Math.max(lastEnd + HOUR, now.getTime() + 12 * HOUR), now.getTime() + 96 * HOUR);
  const span = end - start;
  const pct = (t) => `${Math.min(100, Math.max(0, ((t - start) / span) * 100))}%`;

  const stepH = span <= 30 * HOUR ? 6 : span <= 60 * HOUR ? 12 : 24;
  const ticks = [];
  const first = Math.ceil(start / (stepH * HOUR)) * stepH * HOUR;
  for (let t = first; t < end; t += stepH * HOUR) ticks.push(t);

  return (
    <section className="hda-tl" aria-label="Alert timeline">
      <p className="hda-section-title">Timeline {tz ? '· local time' : ''}</p>
      <div className="hda-tl__grid">
        <div className="hda-tl__now" style={{ left: pct(now.getTime()) }}>
          <span>NOW</span>
        </div>
        {rows.map((a) => {
          const s = Math.max(a.onset?.getTime() ?? start, start);
          const open = !a.ends;
          const e = open ? end : Math.min(a.ends.getTime(), end);
          const left = ((s - start) / span) * 100;
          const width = Math.max(((e - s) / span) * 100, 1.5);
          const label = open
            ? `${a.event} · no end time given`
            : `${a.event} · until ${formatWhen(a.ends, tz || a.tzOffset)}`;
          return (
            <div className="hda-tl__row" key={a.id}>
              <div
                className={`hda-tl__bar tone-${a.sevRank}${open ? ' hda-tl__bar--open' : ''}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={label}
              >
                {a.event}
              </div>
            </div>
          );
        })}
        <div className="hda-tl__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span className="hda-tl__tick" key={t} style={{ left: pct(t) }}>
              {stepH >= 24 ? formatWhen(new Date(t), tz).split(' ')[0] : formatClock(new Date(t), tz)}
            </span>
          ))}
        </div>
      </div>
      {alerts.length > MAX_ROWS && <p className="hda-note">Showing the {MAX_ROWS} most serious of {alerts.length} alerts.</p>}
    </section>
  );
}
