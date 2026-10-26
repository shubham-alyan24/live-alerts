import React, { useEffect, useState } from 'react';
import { fetchFootprint } from '../lib/nws';

const W = 320;
const H = 180;
const PAD = 12;

// Collect all [lon, lat] rings from Polygon / MultiPolygon geometries.
function ringsOf(geometries) {
  const rings = [];
  for (const g of geometries) {
    if (g.type === 'Polygon') rings.push(...g.coordinates);
    if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => rings.push(...poly));
    if (g.type === 'GeometryCollection') rings.push(...ringsOf(g.geometries || []));
  }
  return rings;
}

// Simple equirectangular projection fitted to the shapes (+ the searched place).
// Longitude is scaled by cos(latitude) so shapes aren't stretched.
function project(rings, pin) {
  const pts = rings.flat();
  if (pin) pts.push([pin.lon, pin.lat]);
  // Alaska's Aleutians cross the 180° line: wrap eastern longitudes so the map stays compact.
  const crossesDateline = pts.some((p) => p[0] > 170) && pts.some((p) => p[0] < -100);
  const wrap = (lon) => (crossesDateline && lon > 0 ? lon - 360 : lon);
  const lons = pts.map((p) => wrap(p[0]));
  const lats = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const w = Math.max((maxX - minX) * k, 0.05);
  const h = Math.max(maxY - minY, 0.05);
  const scale = Math.min((W - 2 * PAD) / w, (H - 2 * PAD) / h);
  const offX = (W - w * scale) / 2;
  const offY = (H - h * scale) / 2;
  return ([lon, lat]) => [offX + (wrap(lon) - minX) * k * scale, offY + (maxY - lat) * scale];
}

export default function Footprint({ alert, pin }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchFootprint(alert, { signal: ctrl.signal })
      .then((fp) => !ctrl.signal.aborted && setState({ status: 'ready', ...fp }))
      .catch(() => !ctrl.signal.aborted && setState({ status: 'error' }));
    return () => ctrl.abort();
  }, [alert]);

  if (state.status === 'loading') return <div className="hda-skel" style={{ height: 120 }} aria-label="Loading map" />;

  const rings = state.status === 'ready' ? ringsOf(state.geometries) : [];
  if (!rings.length) {
    return <p className="hda-note">Map shape unavailable for this alert. See the affected areas listed.</p>;
  }

  const toXY = project(rings, pin);
  const path = rings.map((ring) => `M${ring.map((p) => toXY(p).map((n) => n.toFixed(1)).join(',')).join('L')}Z`).join('');
  const pinXY = pin ? toXY([pin.lon, pin.lat]) : null;

  return (
    <figure className="hda-map" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of the area covered by the ${alert.event}`}>
        {[1, 2, 3].map((i) => (
          <line key={`h${i}`} className="hda-map__grid" x1="0" x2={W} y1={(H / 4) * i} y2={(H / 4) * i} />
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} className="hda-map__grid" y1="0" y2={H} x1={(W / 6) * i} x2={(W / 6) * i} />
        ))}
        <path className="hda-map__shape" d={path} fillRule="evenodd" />
        {pinXY && <circle className="hda-map__pin" cx={pinXY[0]} cy={pinXY[1]} r="5" />}
      </svg>
      <figcaption className="hda-map__legend">
        <span><i style={{ background: 'var(--tone)' }} />Alert area</span>
        {pin && <span><i style={{ background: 'var(--text)', borderRadius: '50%' }} />{pin.label}</span>}
        {state.totalZones > state.shownZones && <span>Showing {state.shownZones} of {state.totalZones} zones</span>}
      </figcaption>
    </figure>
  );
}
