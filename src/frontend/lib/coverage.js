// Where the NWS has coverage, and who to send people to when it doesn't.

// NWS covers the US and its territories.
const COVERED = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM']);

export function isCoveredCountry(code) {
  return COVERED.has((code || '').toUpperCase());
}

// Primary time zone per state/territory, used when searchData has no tz
// (e.g. state-level queries), so times are shown in the place's local time.
export const US_STATES = {
  AL: { tz: 'America/Chicago' }, AK: { tz: 'America/Anchorage' }, AZ: { tz: 'America/Phoenix' },
  AR: { tz: 'America/Chicago' }, CA: { tz: 'America/Los_Angeles' }, CO: { tz: 'America/Denver' },
  CT: { tz: 'America/New_York' }, DE: { tz: 'America/New_York' }, DC: { tz: 'America/New_York' },
  FL: { tz: 'America/New_York' }, GA: { tz: 'America/New_York' }, HI: { tz: 'Pacific/Honolulu' },
  ID: { tz: 'America/Boise' }, IL: { tz: 'America/Chicago' }, IN: { tz: 'America/Indiana/Indianapolis' },
  IA: { tz: 'America/Chicago' }, KS: { tz: 'America/Chicago' }, KY: { tz: 'America/New_York' },
  LA: { tz: 'America/Chicago' }, ME: { tz: 'America/New_York' }, MD: { tz: 'America/New_York' },
  MA: { tz: 'America/New_York' }, MI: { tz: 'America/Detroit' }, MN: { tz: 'America/Chicago' },
  MS: { tz: 'America/Chicago' }, MO: { tz: 'America/Chicago' }, MT: { tz: 'America/Denver' },
  NE: { tz: 'America/Chicago' }, NV: { tz: 'America/Los_Angeles' }, NH: { tz: 'America/New_York' },
  NJ: { tz: 'America/New_York' }, NM: { tz: 'America/Denver' }, NY: { tz: 'America/New_York' },
  NC: { tz: 'America/New_York' }, ND: { tz: 'America/Chicago' }, OH: { tz: 'America/New_York' },
  OK: { tz: 'America/Chicago' }, OR: { tz: 'America/Los_Angeles' }, PA: { tz: 'America/New_York' },
  RI: { tz: 'America/New_York' }, SC: { tz: 'America/New_York' }, SD: { tz: 'America/Chicago' },
  TN: { tz: 'America/Chicago' }, TX: { tz: 'America/Chicago' }, UT: { tz: 'America/Denver' },
  VT: { tz: 'America/New_York' }, VA: { tz: 'America/New_York' }, WA: { tz: 'America/Los_Angeles' },
  WV: { tz: 'America/New_York' }, WI: { tz: 'America/Chicago' }, WY: { tz: 'America/Denver' },
  PR: { tz: 'America/Puerto_Rico' }, VI: { tz: 'America/St_Thomas' }, GU: { tz: 'Pacific/Guam' },
  AS: { tz: 'Pacific/Pago_Pago' }, MP: { tz: 'Pacific/Saipan' },
};

// State / territory names, so we can still find the place ourselves when the
// search platform didn't resolve it (e.g. "latest alerts in alaska").
export const STATE_NAMES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'new york state': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  'washington state': 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'puerto rico': 'PR', guam: 'GU', 'virgin islands': 'VI', 'american samoa': 'AS', 'northern mariana islands': 'MP',
};

const EU_METEOALARM = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'ME',
  'MK', 'BA', 'MD', 'IL', 'UA',
]);

// Official national warning services for common non-US searches.
const NATIONAL_SOURCES = {
  IN: [
    { name: 'India Meteorological Department (IMD)', url: 'https://mausam.imd.gov.in/' },
    { name: 'NDMA SACHET – national disaster alerts', url: 'https://sachet.ndma.gov.in/' },
  ],
  CA: [{ name: 'Environment Canada – weather alerts', url: 'https://weather.gc.ca/warnings/index_e.html' }],
  GB: [{ name: 'Met Office – UK weather warnings', url: 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings' }],
  AU: [{ name: 'Bureau of Meteorology – warnings', url: 'https://www.bom.gov.au/' }],
  JP: [{ name: 'Japan Meteorological Agency – warnings', url: 'https://www.jma.go.jp/bosai/warning/' }],
  MX: [{ name: 'Servicio Meteorológico Nacional', url: 'https://smn.conagua.gob.mx/' }],
  NZ: [{ name: 'MetService – severe weather warnings', url: 'https://www.metservice.com/warnings/home' }],
};

const GLOBAL_SOURCES = [
  { name: 'WMO Severe Weather Information Centre', url: 'https://severeweather.wmo.int/' },
  { name: 'GDACS – global disaster alerts', url: 'https://www.gdacs.org/' },
];

export function officialSourcesFor(countryCode) {
  const code = (countryCode || '').toUpperCase();
  const local = NATIONAL_SOURCES[code] || [];
  const eu = EU_METEOALARM.has(code) ? [{ name: 'MeteoAlarm – European weather warnings', url: 'https://meteoalarm.org/' }] : [];
  return [...local, ...eu, ...GLOBAL_SOURCES];
}
