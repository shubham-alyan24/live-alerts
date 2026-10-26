import React from 'react';
import PublicIcon from '@mui/icons-material/Public';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { officialSourcesFor } from '../lib/coverage';

export function Loading({ label }) {
  return (
    <div className="hda-body" aria-busy="true">
      <p className="hda-note" style={{ margin: 0 }}>Checking official alerts {label}…</p>
      <div className="hda-skel" style={{ height: 110 }} />
      <div className="hda-skel" style={{ height: 64 }} />
      <div className="hda-skel" style={{ height: 64 }} />
    </div>
  );
}

// API failure: say clearly that we DON'T know, never "no alerts".
export function ErrorState({ error, onRetry, place }) {
  const officialUrl = place?.lat != null
    ? `https://forecast.weather.gov/MapClick.php?lat=${place.lat}&lon=${place.lon}`
    : 'https://www.weather.gov/alerts';
  return (
    <div className="hda-body">
      <section className="hda-verdict tone-0 hda-state">
        <span className="hda-state__icon"><ErrorOutlineIcon /></span>
        <h2 className="hda-verdict__title">We couldn’t check alerts right now</h2>
        <p className="hda-verdict__lead">
          {error?.message || 'The weather service did not respond.'} This does <strong>not</strong> mean
          there are no alerts. Please check the official source directly.
        </p>
        <div className="hda-row" style={{ marginTop: 12 }}>
          <button className="hda-btn hda-btn--primary" onClick={onRetry}>Try again</button>
          <a className="hda-btn" href={officialUrl} target="_blank" rel="noreferrer">Open weather.gov</a>
        </div>
      </section>
    </div>
  );
}

// Outside NWS coverage: be honest and point to the right official agency.
export function OutOfCoverage({ place }) {
  const sources = officialSourcesFor(place?.countryCode);
  const name = place?.kind === 'user' ? 'Your location' : place?.label || 'This place';
  return (
    <div className="hda-body">
      <section className="hda-verdict tone-calm hda-state">
        <span className="hda-state__icon"><PublicIcon /></span>
        <h2 className="hda-verdict__title">{name} is outside our live alert coverage</h2>
        {place?.geocoded && <p className="hda-note">{place.label} is the best match we found for your search.</p>}
        <p className="hda-verdict__lead">
          Live alerts here come from the US National Weather Service, which only covers the United States
          and its territories. We can’t tell you whether anything is active {place?.country ? `in ${place.country}` : 'there'}.
          That is <strong>not</strong> the same as “no alerts”.
        </p>
      </section>
      <section>
        <p className="hda-section-title">Check the official sources</p>
        <ul className="hda-sources">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.name} <OpenInNewIcon sx={{ fontSize: 14 }} /></a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// The query names a place we couldn't identify. Don't guess, and don't fall back to the user's location.
export function UnrecognizedPlace({ text }) {
  return (
    <div className="hda-body">
      <section className="hda-verdict tone-calm hda-state">
        <span className="hda-state__icon"><LocationOffIcon /></span>
        <h2 className="hda-verdict__title">We couldn’t recognise “{text}” as a place</h2>
        <p className="hda-verdict__lead">
          So we can’t say whether any alerts are active there. Live alerts cover the United States and its
          territories. Try a US city or state, for example “weather alerts in Miami” or “alerts in Alaska”.
        </p>
      </section>
    </div>
  );
}

export function NoLocation() {
  return (
    <div className="hda-body">
      <section className="hda-verdict tone-calm hda-state">
        <span className="hda-state__icon"><LocationOffIcon /></span>
        <h2 className="hda-verdict__title">Where should we check?</h2>
        <p className="hda-verdict__lead">
          This search didn’t include a place we could recognise, and your location isn’t available.
          Try searching with a US place, for example “weather alerts in Houston” or “flood warning in Colorado”.
        </p>
      </section>
    </div>
  );
}
