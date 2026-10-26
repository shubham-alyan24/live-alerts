// Thin client for the National Weather Service alerts API (api.weather.gov).
// Free, no key, CORS-enabled. We add a timeout, one retry and clear error types
// so the UI can tell "no alerts" apart from "we couldn't check".

const BASE = 'https://api.weather.gov';
const HEADERS = { Accept: 'application/geo+json' };

export class NwsError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'network' | 'timeout' | 'rate-limit' | 'server' | 'out-of-area' | 'bad-response'
  }
}

async function getJSON(url, { signal, timeoutMs = 10000 } = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, { headers: HEADERS, signal: timeout.signal });
    if (res.status === 429) throw new NwsError('rate-limit', 'The weather service is rate-limiting requests.');
    if (res.status === 400 || res.status === 404) throw new NwsError('out-of-area', 'This location is outside NWS coverage.');
    if (!res.ok) throw new NwsError('server', `The weather service returned an error (${res.status}).`);
    try {
      return await res.json();
    } catch {
      throw new NwsError('bad-response', 'The weather service sent an unreadable response.');
    }
  } catch (err) {
    if (err instanceof NwsError) throw err;
    if (signal?.aborted) throw err; // the caller cancelled: not an error to show
    if (timeout.signal.aborted) throw new NwsError('timeout', 'The weather service took too long to respond.');
    throw new NwsError('network', 'Could not reach the weather service.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

// Retry once on transient failures (5xx, network, timeout).
async function getJSONWithRetry(url, opts) {
  try {
    return await getJSON(url, opts);
  } catch (err) {
    const transient = err instanceof NwsError && ['server', 'network', 'timeout'].includes(err.kind);
    if (!transient || opts?.signal?.aborted) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return getJSON(url, opts);
  }
}

// scope: { type: 'point', lat, lon } | { type: 'area', area } | { type: 'national' }
export async function fetchActiveAlerts(scope, { signal } = {}) {
  const params = new URLSearchParams({ status: 'actual', message_type: 'alert,update' });
  if (scope.type === 'point') params.set('point', `${scope.lat.toFixed(4)},${scope.lon.toFixed(4)}`);
  if (scope.type === 'area') params.set('area', scope.area);

  const data = await getJSONWithRetry(`${BASE}/alerts/active?${params}`, { signal });
  if (!data || !Array.isArray(data.features)) {
    throw new NwsError('bad-response', 'The weather service sent an unexpected response.');
  }
  return { features: dropSuperseded(data.features), updated: data.updated };
}

// An "update" message references the alert it replaces. If both are present,
// keep only the newest so the same hazard isn't listed twice.
function dropSuperseded(features) {
  const replaced = new Set();
  features.forEach((f) => (f.properties?.references || []).forEach((r) => replaced.add(r['@id'] || r.identifier)));
  return features.filter((f) => !replaced.has(f.properties?.['@id']) && !replaced.has(f.properties?.id));
}

// ---- Alert footprints (for the map) ----

const zoneCache = new Map();
const MAX_ZONES = 12;

// Most alerts have no polygon of their own; they apply to forecast/county zones.
// We fetch those zone shapes (cached) to draw where the alert applies.
export async function fetchFootprint(alert, { signal } = {}) {
  if (alert.geometry) return { geometries: [alert.geometry], totalZones: 0, shownZones: 0 };

  const zones = alert.zones.slice(0, MAX_ZONES);
  const results = await Promise.allSettled(
    zones.map((url) => {
      if (!zoneCache.has(url)) {
        const p = getJSON(url, { signal }).then((z) => z.geometry);
        p.catch(() => zoneCache.delete(url)); // don't cache failures
        zoneCache.set(url, p);
      }
      return zoneCache.get(url);
    }),
  );
  const geometries = results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
  return { geometries, totalZones: alert.zones.length, shownZones: geometries.length };
}
