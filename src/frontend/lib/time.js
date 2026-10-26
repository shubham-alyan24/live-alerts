// Time formatting in the *place's* local time zone (falls back to the viewer's).

function safeFormat(date, tz, options) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: tz }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date); // unknown tz
  }
}

// "Mon 5:45 AM CDT"
export function formatWhen(date, tz) {
  if (!date) return '';
  return safeFormat(date, tz, { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

// "5:45 AM"
export function formatClock(date, tz) {
  if (!date) return '';
  return safeFormat(date, tz, { hour: 'numeric', minute: '2-digit' });
}

// "2h 14m", "3d 4h", "12m"
export function formatDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// "just now", "3 min ago"
export function formatAgo(date, now) {
  if (!date) return '';
  const secs = Math.round((now - date) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}
