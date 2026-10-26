// Turns raw NWS GeoJSON features into clean alert objects for the UI,
// and holds the rules for ranking and grouping them.

export const SEVERITY = {
  Extreme: { rank: 4, label: 'Extreme', hint: 'Extraordinary threat to life or property' },
  Severe: { rank: 3, label: 'Severe', hint: 'Significant threat to life or property' },
  Moderate: { rank: 2, label: 'Moderate', hint: 'Possible threat to life or property' },
  Minor: { rank: 1, label: 'Minor', hint: 'Minimal to no known threat' },
  Unknown: { rank: 0, label: 'Unknown', hint: 'Severity not stated' },
};

// What the alert type means for the reader: the NWS's own definitions, shortened.
export const KINDS = {
  warning: { rank: 4, label: 'Warning', action: 'Take action now', meaning: 'The hazard is happening or about to happen.' },
  watch: { rank: 3, label: 'Watch', action: 'Be prepared', meaning: 'Conditions are favorable for the hazard to develop.' },
  advisory: { rank: 2, label: 'Advisory', action: 'Be aware', meaning: 'Less serious, but it can still cause problems.' },
  statement: { rank: 1, label: 'Statement', action: 'Stay informed', meaning: 'Information about a developing or ongoing hazard.' },
  other: { rank: 0, label: 'Alert', action: 'Stay informed', meaning: 'An official notice from the National Weather Service.' },
};

const URGENCY_RANK = { Immediate: 3, Expected: 2, Future: 1, Past: 0, Unknown: 0 };

// NWS marine zone prefixes (coastal waters, Great Lakes, offshore).
const MARINE_PREFIX = /^(AM|AN|GM|LC|LE|LH|LM|LO|LS|PH|PK|PM|PS|PZ|SL)Z/;

function kindOf(event) {
  const e = event.toLowerCase();
  if (e.includes('warning') || e.includes('emergency')) return 'warning';
  if (e.includes('watch')) return 'watch';
  if (e.includes('advisory')) return 'advisory';
  if (e.includes('statement') || e.includes('outlook')) return 'statement';
  return 'other';
}

const toDate = (s) => (s ? new Date(s) : null);

// The NWS wraps text at ~70 characters. Join wrapped lines back into sentences.
function unwrap(text) {
  return (text || '').replace(/\r/g, '').replace(/([^\n])\n(?![\n\-*])/g, '$1 ').trim();
}

// Pull "* WHAT... * WHERE... * WHEN... * IMPACTS..." sections out of the description.
export function parseSections(description) {
  const sections = {};
  const blocks = (description || '').replace(/\r/g, '').split(/\n\s*\n(?=\s*\*)/);
  for (const block of blocks) {
    const m = block.trim().match(/^\*\s*([A-Z][A-Z ]+?)\.\.\.([\s\S]*)$/);
    if (m) sections[m[1].trim().toLowerCase()] = unwrap(m[2]);
  }
  return sections;
}

// Official instructions as short steps (still the NWS's own words, just split up).
export function instructionSteps(instruction) {
  return unwrap(instruction)
    .split(/\n\s*\n/)
    .flatMap((para) => para.split(/(?<=[.!])\s+(?=[A-Z])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export function normalizeAlert(feature) {
  const p = feature.properties || {};
  const event = p.event || 'Weather alert';
  const ugc = p.geocode?.UGC || [];
  const severity = SEVERITY[p.severity] ? p.severity : 'Unknown';
  const kind = kindOf(event);

  return {
    id: p.id || p['@id'],
    url: p['@id'],
    event,
    severity,
    sevRank: SEVERITY[severity].rank,
    kind,
    urgency: p.urgency || 'Unknown',
    certainty: p.certainty || 'Unknown',
    headline: p.parameters?.NWSheadline?.[0] || p.headline || event,
    sections: parseSections(p.description),
    description: unwrap(p.description),
    steps: instructionSteps(p.instruction),
    areas: (p.areaDesc || '').split(/;\s*/).filter(Boolean),
    onset: toDate(p.onset || p.effective),
    ends: toDate(p.ends), // when the hazard ends (null = no end time given)
    expires: toDate(p.expires), // when this message expires (may be renewed)
    sent: toDate(p.sent),
    sender: p.senderName || 'National Weather Service',
    // The alert's own UTC offset (e.g. "-05:00"), used to show its local time
    // when the search has no single time zone (e.g. "alerts across the US").
    tzOffset: (p.ends || p.onset || p.sent || '').match(/[+-]\d\d:\d\d$/)?.[0],
    isUpdate: p.messageType === 'Update',
    isMarine: ugc.length > 0 && ugc.every((code) => MARINE_PREFIX.test(code)),
    zones: p.affectedZones || [],
    geometry: feature.geometry || null,
  };
}

// Most serious first: severity, then warning > watch > advisory, then urgency, then soonest.
export function compareAlerts(a, b) {
  return (
    b.sevRank - a.sevRank ||
    KINDS[b.kind].rank - KINDS[a.kind].rank ||
    (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0) ||
    (a.onset?.getTime() || 0) - (b.onset?.getTime() || 0)
  );
}

// Hazard / severity filtering. Returns the matches AND what was left out,
// so the UI can say "no flood alerts, but 2 other alerts are active".
export function applyIntentFilter(alerts, { hazard, severeOnly }) {
  if (hazard) {
    return {
      matches: alerts.filter((a) => hazard.events.test(a.event)),
      others: alerts.filter((a) => !hazard.events.test(a.event)),
    };
  }
  if (severeOnly) {
    return {
      matches: alerts.filter((a) => a.sevRank >= SEVERITY.Severe.rank),
      others: alerts.filter((a) => a.sevRank < SEVERITY.Severe.rank),
    };
  }
  return { matches: alerts, others: [] };
}

// "Flood Warning ×3, Heat Advisory ×1" counts for the summary chips.
export function countByEvent(alerts) {
  const counts = new Map();
  for (const a of alerts) {
    const c = counts.get(a.event) || { event: a.event, count: 0, sevRank: a.sevRank, severity: a.severity };
    c.count += 1;
    if (a.sevRank > c.sevRank) Object.assign(c, { sevRank: a.sevRank, severity: a.severity });
    counts.set(a.event, c);
  }
  return [...counts.values()].sort((x, y) => y.sevRank - x.sevRank || y.count - x.count);
}

// Time phase of an alert relative to `now`.
export function phaseOf(alert, now) {
  if (alert.onset && alert.onset > now) return 'upcoming';
  if (alert.ends && alert.ends < now) return 'ending';
  return 'active';
}
