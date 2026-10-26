// Turns the raw searchData from hyperDart into a simple "intent" object:
// WHERE to look (a point, a state, the whole US, or the user's location),
// WHAT to look for (all alerts, one hazard, or only severe ones),
// and HOW to answer (a yes/no question or a normal list).

import { US_STATES, STATE_NAMES, isCoveredCountry } from './coverage';

// Order matters: more specific hazards are checked first
// ("flash flood" before "flood", "winter storm" before "storm").
export const HAZARDS = [
  { id: 'tornado', label: 'tornado', query: /tornado/i, events: /tornado/i },
  { id: 'flash-flood', label: 'flash flood', query: /flash\s+flood/i, events: /flash flood/i },
  { id: 'flood', label: 'flood', query: /flood/i, events: /flood|hydrologic/i },
  { id: 'heat', label: 'heat', query: /heat/i, events: /heat/i },
  { id: 'winter', label: 'winter storm', query: /winter|snow|blizzard|ice\s+storm|freez|frost|cold/i, events: /winter|blizzard|snow|ice storm|freez|frost|cold|wind chill/i },
  { id: 'hurricane', label: 'hurricane', query: /hurricane|tropical/i, events: /hurricane|tropical|storm surge|typhoon/i },
  { id: 'fire', label: 'fire weather', query: /fire|red\s+flag/i, events: /red flag|fire/i },
  { id: 'air', label: 'air quality', query: /air\s+quality|smoke/i, events: /air quality|air stagnation|smoke/i },
  { id: 'storm', label: 'storm', query: /thunder|\bstorms?\b/i, events: /thunderstorm|storm|tornado|hurricane|tropical/i },
  { id: 'wind', label: 'wind', query: /\bwind/i, events: /wind|gale/i },
];

const NEAR_ME = /\b(near|around)\s+me\b|\bnearby\b|\bmy\s+(location|area|city)\b|\bhere\b/i;
const QUESTION = /^\s*(is|are|any|will|do)\b|\?/i;
const SEVERE_ONLY = /\bsevere\b/i;

export function normalizeSearchData(searchData) {
  return (Array.isArray(searchData) ? searchData[0] : searchData) || {};
}

// A named place in the query. HD_USER_LOCATION is "the searcher", not a named place,
// so it is handled by the near-me branch instead.
function findPlaceEntity(entities = []) {
  return entities.find(
    (e) => e && e.collectionType !== 'HD_USER_LOCATION' && (e.collectionType === 'HD_LOCATION' || e.entityInfo?.geo),
  );
}

// Collection names from the hyperDart Entities docs:
// CITIES, ZIP_CODES, COUNTRIES_CAPITAL, COUNTRIES, STATES_ADMIN1, COUNTY/DISTRICT_ADMIN2, REGIONS.
// Everything except a whole country or state is looked up by its exact point.
function placeKind(entity) {
  const name = (entity.collectionName || '').toUpperCase();
  const geo = entity.entityInfo?.geo || {};
  if (name.includes('CAPITAL')) return 'city'; // COUNTRIES_CAPITAL is a city, not a country
  if (name === 'COUNTRIES') return 'country';
  if (name.startsWith('STATES')) return 'state';
  if (!geo.city && geo.state) return 'state';
  return 'city';
}

// The search text. Regex/keyword matches send `query`; hyperDart's AI fallback
// sends no query at all, only the leftover words (e.g. ["live","weather","alerts","alaska"]).
function queryText(sd) {
  const words = sd.explanation?.queryObjectToolInfo?.metaData?.unresolvedQuery;
  return (sd.query || sd.queryTerm || sd._processedQuery || (Array.isArray(words) ? words.join(' ') : '')).trim();
}

export function parseQuery(searchData) {
  const sd = normalizeSearchData(searchData);
  const query = queryText(sd);

  const hazard = HAZARDS.find((h) => h.query.test(query)) || null;
  const severeOnly = !hazard && SEVERE_ONLY.test(query);
  const isQuestion = QUESTION.test(query);

  const base = { query, hazard, severeOnly, isQuestion };
  const entity = findPlaceEntity(sd.entities);

  // 1. A place was named in the query.
  if (entity && !NEAR_ME.test(query)) {
    const geo = entity.entityInfo?.geo || {};
    const kind = placeKind(entity);
    const countryCode = (geo.countryCode || '').toUpperCase();
    const place = {
      kind,
      name: geo.city || geo.state || geo.country || entity.word,
      label: buildLabel(kind, geo, entity.word),
      lat: num(geo.lat),
      lon: num(geo.long ?? geo.lon),
      stateAbb: geo.stateAbb,
      state: geo.state,
      countryCode,
      country: geo.country,
      tz: geo.tz || US_STATES[geo.stateAbb]?.tz,
    };
    return { ...base, place, scope: scopeFor(place) };
  }

  // 2. The query names a place the platform didn't resolve ("latest alerts in alaska").
  //    Never silently swap in the user's own location: recognise a US state ourselves,
  //    or say honestly that we couldn't identify the place.
  const named = !NEAR_ME.test(query) && namedPlace(query);
  if (named) {
    const stateAbb = STATE_NAMES[named.toLowerCase()];
    if (stateAbb) {
      const label = named.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ State$/, '');
      const place = { kind: 'state', name: label, label, stateAbb, state: label, countryCode: 'US', tz: US_STATES[stateAbb]?.tz };
      return { ...base, place, scope: { type: 'area', area: stateAbb } };
    }
    return { ...base, place: { kind: 'unknown', name: named, label: named }, scope: { type: 'unrecognized', text: named } };
  }

  // 3. No search text at all: we don't know what was asked, so don't assume "near me".
  if (!query) return { ...base, place: null, scope: { type: 'no-location' } };

  // 4. "near me" (or no place named): fall back to the searcher's position.
  const pos = sd.userLocation?.position;
  const lat = num(pos?.coords?.latitude);
  const lon = num(pos?.coords?.longitude);
  if (lat == null || lon == null) {
    return { ...base, place: null, scope: { type: 'no-location' } };
  }
  const countryCode = (pos.countryCode || '').toUpperCase();
  const place = {
    kind: 'user',
    name: pos.city || 'your location',
    label: pos.city ? `your area (${pos.city})` : 'your area',
    lat,
    lon,
    countryCode,
    approximate: sd.userLocation?.source === 'ip',
    tz: undefined, // the searcher's own browser time zone
  };
  return { ...base, place, scope: scopeFor(place) };
}

// Decide which NWS request answers the question for this place.
export function scopeFor(place) {
  if (place.countryCode && !isCoveredCountry(place.countryCode)) {
    return { type: 'unsupported' };
  }
  if (place.kind === 'country') {
    // US territories are their own NWS "area" (PR, GU, ...); the US as a whole is national.
    return place.countryCode === 'US' ? { type: 'national' } : { type: 'area', area: place.countryCode };
  }
  if (place.kind === 'state' && place.stateAbb) {
    return { type: 'area', area: place.stateAbb };
  }
  if (place.lat != null && place.lon != null) {
    return { type: 'point', lat: place.lat, lon: place.lon, area: place.stateAbb };
  }
  return place.stateAbb ? { type: 'area', area: place.stateAbb } : { type: 'no-location' };
}

// The words after "in / for / at / across": "latest alerts in alaska right now?" → "alaska".
// Also catches a bare state name with no preposition: "alaska", "texas weather alerts".
function namedPlace(query) {
  const m = query.match(/\b(?:in|for|at|across)\s+(?:the\s+)?([a-z][a-z .'-]*?)\s*(?:\b(?:right\s+now|today|tonight|now)\b|\?|$)/i);
  const text = m?.[1]?.trim();
  if (text && !/^(me|my\s+area|here)$/i.test(text)) return text;

  // Strip alert words, hazard words and filler; whatever is left is meant to be a place.
  let bare = query.toLowerCase();
  HAZARDS.forEach((h) => { bare = bare.replace(new RegExp(h.query.source, 'gi'), ' '); });
  bare = bare
    .replace(/\b(is|are|there|a|an|any|the|what|show|latest|current|active|live|new|severe|weather|safety|emergency|alerts?|warnings?|watch(es)?|advisor(y|ies)|statements?|right|now|today|tonight)\b/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return bare || null;
}

function buildLabel(kind, geo, word) {
  if (kind === 'city' && geo.city) return geo.stateAbb ? `${geo.city}, ${geo.stateAbb}` : geo.city;
  if (kind === 'state') return geo.state || word;
  return geo.country || word;
}

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}
