import React from 'react';
import { SEVERITY } from '../lib/alerts';
import { timingText } from './AlertCard';
import { formatClock } from '../lib/time';

const SCALE = ['Minor', 'Moderate', 'Severe', 'Extreme'];

// Where the most serious alert sits on the official 4-step NWS severity scale.
function SeverityScale({ rank }) {
  return (
    <div className="hda-scale" aria-label={`Highest severity: ${SCALE[rank - 1] || 'Unknown'}`}>
      <div className="hda-scale__track">
        {SCALE.map((s, i) => (
          <span key={s} className={`hda-scale__seg${i < rank ? ' is-on' : ''}`} style={{ '--seg': `var(--sev-${i + 1})` }} />
        ))}
      </div>
      <div className="hda-scale__labels" aria-hidden="true">
        {SCALE.map((s, i) => <span key={s} className={i === rank - 1 ? 'is-top' : ''}>{s}</span>)}
      </div>
    </div>
  );
}

// The answer: is anything happening, how serious, and until when.
export default function Verdict({ verdict, now, tz, checkedAt }) {
  const { top } = verdict;
  const tone = top ? `tone-${top.sevRank}` : 'tone-calm';

  return (
    <section className={`hda-verdict ${tone}`} aria-live="polite">
      {verdict.answer && <span className="hda-verdict__answer">{verdict.answer}</span>}
      <h2 className="hda-verdict__title">{verdict.title}</h2>

      {top ? (
        <>
          <p className="hda-verdict__lead">
            Most serious: <strong>{top.event}</strong>
            {top.sections.what ? ` · ${top.sections.what}` : ''}
          </p>
          <div className="hda-verdict__meta">
            <span><strong>{SEVERITY[top.severity].label}</strong> severity</span>
            <span className="hda-countdown">{timingText(top, now, tz || top.tzOffset)}</span>
          </div>
          {top.sevRank > 0 && <SeverityScale rank={top.sevRank} />}
        </>
      ) : (
        <p className="hda-note" style={{ color: 'var(--text)' }}>
          The National Weather Service has no active watches, warnings or advisories here
          {checkedAt ? ` as of ${formatClock(checkedAt, tz)}` : ''}. This is not an all-clear:
          conditions can change quickly, so check again before you travel and follow local officials.
        </p>
      )}
    </section>
  );
}
