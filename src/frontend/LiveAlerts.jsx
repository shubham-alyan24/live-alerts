import React, { useEffect, useMemo, useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import './styles.css';

import { parseQuery } from './lib/query';
import { applyIntentFilter, countByEvent } from './lib/alerts';
import { buildVerdict, placePhrase } from './lib/verdict';
import { formatAgo, formatClock } from './lib/time';
import { useAlerts, useNow } from './hooks/useAlerts';
import { useResolvedIntent } from './hooks/useResolvedIntent';

import Verdict from './components/Verdict';
import Timeline from './components/Timeline';
import AlertCard from './components/AlertCard';
import { Loading, ErrorState, OutOfCoverage, NoLocation, UnrecognizedPlace } from './components/States';

const PAGE = 6;

export default function LiveAlerts({ searchData, UIOptions, format, messageHandlers }) {
  const parsed = useMemo(() => parseQuery(searchData), [searchData]);
  const { intent, resolving } = useResolvedIntent(parsed); // looks up unrecognised place names

  // Local debugging only: Vite strips this from the published build.
  if (import.meta.env.DEV) console.log('[live-alerts]', { searchData, intent });

  // The user can widen a quiet city search to its whole state.
  const [scopeOverride, setScopeOverride] = useState(null);
  useEffect(() => setScopeOverride(null), [parsed]);
  const scope = scopeOverride || intent.scope;

  const result = useAlerts(resolving ? null : scope);
  const now = useNow();

  // Tell hyperDart we're ready once the first answer (or error) is on screen. Only once.
  const loaded = !resolving && result.status !== 'loading' && result.status !== 'idle';
  useEffect(() => {
    if (loaded) messageHandlers?.componentLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const theme = UIOptions?.themeName || 'light';
  const view = UIOptions?.format || format;
  const wide = view === 'mainline' || view === 'fullscreen';
  const rootClass = [
    'hda',
    theme === 'dark' || theme === 'lightsOut' ? 'hda--dark' : '',
    theme === 'lightsOut' ? 'hda--lightsOut' : '',
    wide ? 'hda--mainline' : 'hda--sidebar',
  ].join(' ');

  const where = placePhrase(intent, scope);
  const tz = intent.place?.tz;

  let body;
  if (result.status === 'unsupported') body = <OutOfCoverage place={intent.place} />;
  else if (result.status === 'no-location') body = <NoLocation />;
  else if (result.status === 'unrecognized') body = <UnrecognizedPlace text={scope.text} />;
  else if (result.status === 'error') body = <ErrorState error={result.error} onRetry={result.reload} place={intent.place} />;
  else if (result.status === 'ready') {
    body = (
      <Results
        key={`${intent.query}|${JSON.stringify(scope)}`}
        intent={intent}
        scope={scope}
        alerts={result.alerts}
        checkedAt={result.checkedAt}
        now={now}
        tz={tz}
        onWiden={(area) => setScopeOverride({ type: 'area', area })}
      />
    );
  } else body = <Loading label={where} />;

  return (
    <div className={rootClass}>
      <header className="hda-bar">
        <span className={`hda-live${result.stale ? ' hda-live--stale' : ''}`} aria-hidden="true" />
        <span className="hda-bar__title">Live alerts</span>
        <span className="hda-bar__spacer" />
        {result.status === 'ready' && (
          <span title={result.stale ? result.error?.message : undefined}>
            {result.stale
              ? `Couldn’t refresh · data from ${formatClock(result.checkedAt, tz)}`
              : `Updated ${formatAgo(result.checkedAt, now)}`}
          </span>
        )}
        {(result.status === 'ready' || result.status === 'error') && (
          <button className="hda-iconbtn" onClick={result.reload} aria-label="Refresh alerts">
            <RefreshIcon sx={{ fontSize: 15 }} className={result.refreshing ? 'hda-spin' : ''} />
          </button>
        )}
      </header>

      {scopeOverride && (
        <div className="hda-row" style={{ padding: '10px 16px 0' }}>
          <button className="hda-linkbtn" onClick={() => setScopeOverride(null)}>← Back to {intent.place?.label}</button>
        </div>
      )}

      {body}

      <footer className="hda-foot">
        Source: US National Weather Service (api.weather.gov), official watches, warnings and advisories.
        {intent.place?.approximate && ' Your location is approximate (based on your network).'}
        {' '}In an emergency, follow local officials and call 911.
      </footer>
    </div>
  );
}

function Results({ intent, scope, alerts, checkedAt, now, tz, onWiden }) {
  const [showMarine, setShowMarine] = useState(false);
  const [eventFilter, setEventFilter] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  const { matches, others } = applyIntentFilter(alerts, intent);

  // Marine alerts (coastal waters) can outnumber land alerts 3:1 in a state search.
  // We count them honestly but tuck them away, unless they are all there is.
  const land = matches.filter((a) => !a.isMarine);
  const marine = matches.filter((a) => a.isMarine);
  const primary = land.length ? land : marine;
  const hiddenMarine = land.length ? marine : [];
  const listed = showMarine ? [...primary, ...hiddenMarine] : primary;
  const filtered = eventFilter ? listed.filter((a) => a.event === eventFilter) : listed;

  const verdict = buildVerdict({ intent, scope, matches: primary });
  const pin = scope.type === 'point' ? { lat: scope.lat, lon: scope.lon, label: intent.place.kind === 'user' ? 'You (approx.)' : intent.place.label } : null;
  const counts = countByEvent(listed);
  const otherLand = others.filter((a) => !a.isMarine);

  // For a quiet city, look at the rest of its state for context (not reassurance).
  const quietCity = scope.type === 'point' && !primary.length && !otherLand.length && intent.place?.stateAbb;
  const context = useAlerts(quietCity ? { type: 'area', area: intent.place.stateAbb } : null);
  const contextLand = context.status === 'ready' ? context.alerts.filter((a) => !a.isMarine) : [];

  return (
    <div className="hda-body">
      {intent.place?.geocoded && (
        <p className="hda-note" style={{ margin: 0 }}>
          Showing results for <strong>{intent.place.label}</strong>, the best match for “{intent.query}”.
        </p>
      )}
      <div className="hda-top">
        <Verdict verdict={verdict} now={now} tz={tz} checkedAt={checkedAt} />
        {primary.length > 0 && <Timeline alerts={primary} now={now} tz={tz} />}
      </div>

      {counts.length > 1 && (
        <section>
          <p className="hda-section-title">Filter by alert type</p>
          <div className="hda-chips" role="group" aria-label="Filter by alert type">
            <button className={`hda-chip${!eventFilter ? ' is-active' : ''}`} onClick={() => setEventFilter(null)}>
              All <span className="hda-chip__n">{listed.length}</span>
            </button>
            {counts.map((c) => (
              <button
                key={c.event}
                className={`hda-chip tone-${c.sevRank}${eventFilter === c.event ? ' is-active' : ''}`}
                onClick={() => setEventFilter(eventFilter === c.event ? null : c.event)}
                aria-pressed={eventFilter === c.event}
              >
                <span className="hda-chip__dot" />
                {c.event} <span className="hda-chip__n">{c.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <section>
          <p className="hda-section-title">Active alerts · tap for details</p>
          <div className="hda-list">
            {filtered.slice(0, limit).map((a) => (
              <AlertCard key={a.id} alert={a} now={now} tz={tz} pin={pin} defaultOpen={filtered.length === 1} />
            ))}
          </div>
          {filtered.length > limit && (
            <button className="hda-btn" style={{ marginTop: 10 }} onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more of {filtered.length - limit}
            </button>
          )}
        </section>
      )}

      {hiddenMarine.length > 0 && (
        <div className="hda-row">
          <span className="hda-note" style={{ margin: 0 }}>
            {showMarine ? 'Including' : 'Plus'} {hiddenMarine.length} marine alert{hiddenMarine.length === 1 ? '' : 's'} for coastal waters.
          </span>
          <button className="hda-linkbtn" onClick={() => setShowMarine((v) => !v)}>
            {showMarine ? 'Hide marine alerts' : 'Show them'}
          </button>
        </div>
      )}

      {otherLand.length > 0 && (
        <section>
          <p className="hda-section-title">
            {primary.length ? 'Other active alerts' : `But ${otherLand.length} other alert${otherLand.length === 1 ? ' is' : 's are'} active`} {placePhrase(intent, scope)}
          </p>
          <div className="hda-list">
            {otherLand.slice(0, PAGE).map((a) => <AlertCard key={a.id} alert={a} now={now} tz={tz} pin={pin} />)}
          </div>
        </section>
      )}

      {quietCity && contextLand.length > 0 && (
        <section className="hda-tl">
          <p className="hda-section-title">Elsewhere in {intent.place.state || intent.place.stateAbb}</p>
          <p style={{ margin: '0 0 8px' }}>
            {contextLand.length} active alert{contextLand.length === 1 ? '' : 's'} in other parts of the state:
          </p>
          <div className="hda-chips" style={{ marginBottom: 10 }}>
            {countByEvent(contextLand).slice(0, 5).map((c) => (
              <span key={c.event} className={`hda-chip tone-${c.sevRank}`}><span className="hda-chip__dot" />{c.event} <span className="hda-chip__n">{c.count}</span></span>
            ))}
          </div>
          <button className="hda-btn" onClick={() => onWiden(intent.place.stateAbb)}>
            See all {intent.place.state || intent.place.stateAbb} alerts
          </button>
        </section>
      )}
    </div>
  );
}
