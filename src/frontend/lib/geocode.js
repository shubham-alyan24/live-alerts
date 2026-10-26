// Backup place lookup for when hyperDart sends a place name without coordinates
// (its AI fallback sends only loose words like ["alerts", "houston"]).
// Open-Meteo geocoding: free, no API key, CORS-enabled. Results are ranked by
// prominence, so "delhi" → Delhi, India (not Delhi, New York).

import { STATE_NAMES } from './coverage';

const URL_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const TERRITORIES = new Set(['PR', 'GU', 'VI', 'AS', 'MP']);

// Returns a place object in the same shape query.js builds, or null if nothing matched.
export async function geocodePlace(name, { signal } = {}) {
  const params = new URLSearchParams({ name, count: '1', language: 'en', format: 'json' });
  const res = await fetch(`${URL_BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const r = (await res.json()).results?.[0];
  if (!r) return null;

  const countryCode = (r.country_code || '').toUpperCase();
  const stateAbb = STATE_NAMES[(r.admin1 || '').toLowerCase()] || (TERRITORIES.has(countryCode) ? countryCode : undefined);
  const region = countryCode === 'US' ? stateAbb || r.admin1 : r.country || countryCode;

  return {
    kind: 'city',
    name: r.name,
    label: region ? `${r.name}, ${region}` : r.name,
    lat: r.latitude,
    lon: r.longitude,
    stateAbb,
    state: r.admin1,
    countryCode,
    country: r.country,
    tz: r.timezone,
    geocoded: true, // so the UI can say which place we matched
  };
}
