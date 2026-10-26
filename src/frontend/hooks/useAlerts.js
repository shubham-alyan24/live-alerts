import { useEffect, useState } from 'react';
import { fetchActiveAlerts } from '../lib/nws';
import { normalizeAlert, compareAlerts } from '../lib/alerts';

const REFRESH_MS = 3 * 60 * 1000; // alerts change fast; re-check every 3 minutes

// Loads active alerts for a scope and keeps them fresh.
// status: 'idle' | 'loading' | 'ready' | 'error' | 'unsupported' | 'no-location' | 'unrecognized'
// If a background refresh fails we keep the last good data and mark it `stale`,
// rather than wiping the screen (or pretending it's still current).
export function useAlerts(scope) {
  const [state, setState] = useState({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    if (!scope) return setState({ status: 'idle' });
    if (['unsupported', 'no-location', 'unrecognized'].includes(scope.type)) return setState({ status: scope.type });

    const ctrl = new AbortController();
    setState((prev) => (prev.status === 'ready' ? { ...prev, refreshing: true } : { status: 'loading' }));

    fetchActiveAlerts(scope, { signal: ctrl.signal })
      .then(({ features }) => {
        setState({
          status: 'ready',
          alerts: features.map(normalizeAlert).sort(compareAlerts),
          checkedAt: new Date(),
        });
      })
      .catch((error) => {
        if (ctrl.signal.aborted) return;
        if (error.kind === 'out-of-area') return setState({ status: 'unsupported' });
        setState((prev) =>
          prev.status === 'ready'
            ? { ...prev, refreshing: false, stale: true, error }
            : { status: 'error', error },
        );
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, reloadKey]);

  useEffect(() => {
    if (!scope) return undefined;
    const timer = setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  return { ...state, reload: () => setReloadKey((k) => k + 1) };
}

// A clock that ticks, so countdowns and "updated 2 min ago" stay live.
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
