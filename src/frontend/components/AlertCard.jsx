import React, { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HazardIcon from './HazardIcon';
import Footprint from './Footprint';
import { KINDS, SEVERITY, phaseOf } from '../lib/alerts';
import { formatDuration, formatWhen } from '../lib/time';

const MAX_AREAS = 3;
const MAX_STEPS = 5;

// "until Mon 5:45 AM CDT · 2h 10m left" / "starts Tue 9:00 AM · in 5h" / "no end time given"
export function timingText(alert, now, tz) {
  const phase = phaseOf(alert, now);
  if (phase === 'upcoming') return `Starts ${formatWhen(alert.onset, tz)} · in ${formatDuration(alert.onset - now)}`;
  if (!alert.ends) return 'No end time given yet';
  if (phase === 'ending') return `Was due to end ${formatWhen(alert.ends, tz)} · awaiting NWS update`;
  return `Until ${formatWhen(alert.ends, tz)} · ${formatDuration(alert.ends - now)} left`;
}

export default function AlertCard({ alert, now, tz: placeTz, pin, defaultOpen = false }) {
  const tz = placeTz || alert.tzOffset;
  const [open, setOpen] = useState(defaultOpen);
  const [showFull, setShowFull] = useState(false);
  const [allSteps, setAllSteps] = useState(false);

  const kind = KINDS[alert.kind];
  const what = alert.sections.what || alert.headline;
  const areas = alert.areas;
  const steps = allSteps ? alert.steps : alert.steps.slice(0, MAX_STEPS);
  const bodyId = `hda-body-${alert.id}`;

  return (
    <article className={`hda-card tone-${alert.sevRank}${open ? ' is-open' : ''}`}>
      <button className="hda-card__head" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId}>
        <span className="hda-card__top">
          <span className="hda-card__icon"><HazardIcon event={alert.event} /></span>
          <span className="hda-card__event">{alert.event}</span>
          <span className="hda-badge">{SEVERITY[alert.severity].label}</span>
          <span className="hda-card__chev"><ExpandMoreIcon fontSize="small" /></span>
        </span>
        <p className="hda-card__what">{what}</p>
        <span className="hda-card__facts">
          <span>
            <PlaceOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
            {areas.slice(0, MAX_AREAS).join(', ')}
            {areas.length > MAX_AREAS && ` +${areas.length - MAX_AREAS} more`}
          </span>
          <span>
            <ScheduleIcon sx={{ fontSize: 15 }} aria-hidden="true" />
            {timingText(alert, now, tz)}
          </span>
        </span>
      </button>

      {open && (
        <div className="hda-card__body" id={bodyId}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="hda-block">
              <h4>{kind.label}: {kind.action}</h4>
              <p>{kind.meaning}</p>
            </div>

            <div className="hda-block">
              <h4>What to do now</h4>
              {steps.length ? (
                <>
                  <ul className="hda-steps">
                    {steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  {alert.steps.length > MAX_STEPS && (
                    <button className="hda-linkbtn" onClick={() => setAllSteps((v) => !v)}>
                      {allSteps ? 'Show fewer' : `Show all ${alert.steps.length} steps`}
                    </button>
                  )}
                  <p className="hda-note">From the official NWS instructions.</p>
                </>
              ) : (
                <p>This alert includes no specific instructions. Stay alert to changing conditions and follow guidance from local officials.</p>
              )}
            </div>

            {alert.sections.impacts && (
              <div className="hda-block">
                <h4>Possible impacts</h4>
                <p>{alert.sections.impacts}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="hda-block">
              <h4>Where exactly</h4>
              <Footprint alert={alert} pin={pin} />
              {alert.sections.where && <p style={{ marginTop: 8 }}>{alert.sections.where}</p>}
              <div className="hda-areas" style={{ marginTop: 8 }}>
                {areas.map((a) => <span className="hda-area" key={a}>{a}</span>)}
              </div>
            </div>

            <div className="hda-block">
              <h4>Details</h4>
              <dl className="hda-kv">
                <dt>Starts</dt><dd>{alert.onset ? formatWhen(alert.onset, tz) : 'Now'}</dd>
                <dt>Ends</dt><dd>{alert.ends ? formatWhen(alert.ends, tz) : 'Not yet announced'}</dd>
                {alert.sections.when && (<><dt>NWS says</dt><dd>{alert.sections.when}</dd></>)}
                <dt>Urgency</dt><dd>{alert.urgency}</dd>
                <dt>Certainty</dt><dd>{alert.certainty}</dd>
                <dt>Issued by</dt><dd>{alert.sender}{alert.sent ? `, ${formatWhen(alert.sent, tz)}` : ''}</dd>
              </dl>
            </div>

            <div className="hda-block">
              <button className="hda-linkbtn" onClick={() => setShowFull((v) => !v)} aria-expanded={showFull}>
                {showFull ? 'Hide' : 'Read'} the full official bulletin
              </button>
              {showFull && <pre className="hda-fulltext">{alert.description}{alert.steps.length ? `\n\n${alert.steps.join(' ')}` : ''}</pre>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
