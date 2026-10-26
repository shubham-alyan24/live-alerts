import { useEffect, useState } from 'react';
import { geocodePlace } from '../lib/geocode';
import { scopeFor } from '../lib/query';

// If the query named a place we couldn't identify ("alerts houston" from hyperDart's
// AI fallback), look it up by name. Otherwise the intent passes straight through.
// If the lookup finds nothing or fails, the intent stays "unrecognized" and the UI says so.
export function useResolvedIntent(intent) {
  const text = intent.scope.type === 'unrecognized' ? intent.scope.text : null;
  const [lookup, setLookup] = useState({ text: null, place: null });

  useEffect(() => {
    if (!text) return undefined;
    const ctrl = new AbortController();
    geocodePlace(text, { signal: ctrl.signal })
      .then((place) => setLookup({ text, place }))
      .catch(() => !ctrl.signal.aborted && setLookup({ text, place: null }));
    return () => ctrl.abort();
  }, [text]);

  if (!text) return { intent, resolving: false };
  if (lookup.text !== text) return { intent, resolving: true };
  if (!lookup.place) return { intent, resolving: false };
  return { intent: { ...intent, place: lookup.place, scope: scopeFor(lookup.place) }, resolving: false };
}
