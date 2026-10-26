// Builds the one-line answer at the top of the component.
// Rule: never imply safety. "No alerts" always says who we checked with and when,
// and that it is not an all-clear.

export function placePhrase(intent, scope) {
  const { place } = intent;
  if (!place) return '';
  if (place.kind === 'user') return place.name === 'your location' ? 'near you' : `near you (${place.name})`;
  if (scope.type === 'national') return 'across the US';
  // A city widened to its whole state ("See all of Texas").
  if (scope.type === 'area' && place.kind === 'city') return `across ${place.state || scope.area}`;
  if (scope.type === 'area') return `across ${place.label}`;
  return `in ${place.label}`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function subject(intent) {
  if (intent.hazard) return `${intent.hazard.label} alert`;
  if (intent.severeOnly) return 'severe alert';
  return 'active alert';
}

export function buildVerdict({ intent, scope, matches }) {
  const where = placePhrase(intent, scope);
  const what = subject(intent);
  const n = matches.length;

  if (n > 0) {
    const title = `${plural(n, what)} ${where}`;
    return {
      answer: intent.isQuestion ? 'Yes' : null,
      title: intent.isQuestion ? `${title.charAt(0).toUpperCase()}${title.slice(1)}` : title,
      top: matches[0],
    };
  }

  return {
    answer: intent.isQuestion ? 'No' : null,
    title: `No ${what}s ${where} right now`,
    top: null,
  };
}
