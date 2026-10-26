# Live Alerts: a hyperDart safety-alert component

▶️ **[Watch the demo video](https://youtu.be/gWPd6j-Rf9k)** · 📦 Published as `@user1985/live-alerts` on the hyperDart dev registry

When someone searches *"weather alerts in Houston"* or *"is there a heat advisory in Phoenix"*, this component answers four questions in one look:

> **Is anything happening there right now? How serious is it? Where exactly? Until when?**

It then lets them dig deeper: official safety steps, a map of the alert area, a timeline, and the full bulletin. All data is live from the US National Weather Service.

---

## The idea

Official warnings are accurate but hard to read. They are long bulletins in capital letters, split by forecast zones, written for professionals. People searching want a short answer they can trust. This component turns the official data into that answer without changing what it says.

The rule behind every screen: **never give false reassurance.**

- "No alerts" always says *who* we checked with and *when*, and says plainly that it is **not an all-clear**.
- "We couldn't reach the weather service" is never shown as "no alerts".
- A place outside NWS coverage (e.g. Delhi) is never shown as "no alerts". It says we can't tell, and links to that country's official agency.

## What it does

| Query | What you see |
|---|---|
| `weather alerts in Houston` | Active alerts for that exact point, or an honest "none right now", plus how many alerts are active elsewhere in Texas, with a button to see them |
| `flood warnings in Colorado` | Only flood-related alerts across the state. If there are none, it says so and lists the *other* active alerts instead of hiding them |
| `severe weather alerts in Alaska` | Only Severe / Extreme alerts; the less serious ones are listed separately |
| `is there a heat advisory in Phoenix` | A direct **YES** / **NO** badge, then details |
| `weather alerts near me` | Alerts at the searcher's (approximate, IP-based) location, labelled as approximate |
| `weather alerts in Delhi` | "Outside our live coverage". Links to IMD and NDMA SACHET (India), MeteoAlarm (Europe), Environment Canada, Met Office, etc., and WMO / GDACS as global fallbacks |

### Screen anatomy
1. **Verdict**: one sentence answer (+ YES/NO for questions), the most serious alert, a live countdown ("Until Mon 5:45 AM CDT · 2h 10m left"), and where it sits on the official 4-step severity scale.
2. **Timeline**: every alert as a bar on one time axis with a NOW line, in the place's local time. Alerts with no announced end fade out instead of showing an invented end time.
3. **Filter chips**: alert types with counts, to narrow the list.
4. **Alert cards**: hazard icon, severity, the official *WHAT* line, areas and time left. Tap to expand:
   - **Warning / Watch / Advisory** explained in one line ("Take action now" / "Be prepared" / "Be aware")
   - **What to do now**: the NWS's own instructions, split into short steps (never rewritten)
   - **Where exactly**: a map of the alert's zones, with a pin for the searched place
   - urgency, certainty, issuing office, and the full official bulletin
5. **Live**: auto-refreshes every 3 minutes. If a refresh fails it keeps the last data and says *"Couldn't refresh · data from 3:42 AM"*.

## Design decisions

- **No green, ever.** The "nothing active" state uses a neutral slate blue. Green reads as "safe", and the NWS can't promise that.
- **Severity colours follow the NWS scale** (Minor → Moderate → Severe → Extreme as yellow → orange → red → purple), tuned separately for light, dark and lights-out themes.
- **Marine alerts are grouped separately.** On a typical day around 70% of active NWS alerts are for coastal waters (Small Craft Advisory, Gale Warning…). In a state search they would bury land alerts, so they are counted and offered behind "Show them", unless they are the only matches.
- **Filter on our side, not in the API.** We fetch all active alerts for the place and filter by hazard ourselves. That way *"flood warnings in X"* can honestly say "No flood alerts, **but 2 other alerts are active**".
- **Quote, don't paraphrase.** Safety guidance comes from the official `instruction` field. We only split it into sentences. The *WHAT / WHERE / WHEN / IMPACTS* sections are parsed out of the official description.
- **Local time of the place**, not the viewer: from the search entity's time zone, then the state's main time zone, then the alert's own UTC offset.
- **Sidebar vs mainline**: one column in the sidebar. In mainline the verdict and timeline sit side by side, cards form a 2-column grid, and an open card spans the full width with its map next to the steps.
- **Accessible**: real buttons with `aria-expanded`, `aria-live` on the verdict, visible focus rings, reduced-motion support.

## Robustness

| Situation | Behaviour |
|---|---|
| Quiet day | Honest "none right now" + time checked + "not an all-clear" + nearby context |
| Place outside the US | Detected from the country code. As a backup, the NWS `400 out of bounds` response is also treated as "outside coverage" |
| API slow / down / rate-limited | 10 s timeout, one automatic retry, then "We couldn't check, this does not mean there are no alerts" with Retry and a weather.gov link |
| Refresh fails after data loaded | Keeps showing the last data, marked stale with its time |
| Duplicate alert + its update | Alerts replaced by a newer update (`references`) are dropped |
| Alert with no end time | "No end time given yet", never a made-up time |
| Alaska's Aleutians crossing 180° | Map wraps longitudes so the shape stays readable |
| No place and no location | Asks the user to search with a place |
| Place named but not resolved by hyperDart ("latest alerts in alaska", AI-fallback searches) | Recognise state names locally, else geocode the name, else "We couldn't recognise 'X' as a place". Never answers about a different place |
| `searchData` as array or object | Both accepted |

## Data sources

- **[NWS Alerts API](https://www.weather.gov/documentation/services-web-api)**: `GET https://api.weather.gov/alerts/active?point=lat,lon` (cities, near me) or `?area=TX` (states, territories), always with `status=actual&message_type=alert,update` and `Accept: application/geo+json`. Free, no key, CORS-enabled, so there is no backend.
- **NWS zones API**: `affectedZones` URLs, fetched only when a card is opened, cached, at most 12 per alert, to draw the map.
- **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)**: backup only. hyperDart's AI fallback can send a search with no `query` and no coordinates, just loose words (`["alerts","houston"]`). We then recognise US state names ourselves, and look anything else up by name (free, no key). The UI always says which place was matched ("Showing results for Houston, TX, the best match for …"). If nothing matches we say we couldn't recognise the place; we never fall back to the user's own location.
- Links (not fetched) to official agencies outside the US: IMD, NDMA SACHET, Environment Canada, Met Office, BoM, JMA, SMN, MetService, MeteoAlarm, WMO SWIC, GDACS.

## Code structure

```
src/frontend/
  index.jsx              entry: withHD(LiveAlerts) (required by hyperDart)
  LiveAlerts.jsx         root: theme/format, top bar, picks which state to show; Results layout
  styles.css             all styles, scoped under .hda, theme variables
  lib/
    query.js             searchData → intent: place + scope, hazard, severe-only, yes/no question
    coverage.js          NWS coverage, state time zones, official sources for other countries
    nws.js               API client: timeout, retry, typed errors, superseded-alert removal, zone shapes
    geocode.js           backup place lookup by name (Open-Meteo) for unresolved places
    alerts.js            normalise alerts, parse WHAT/WHERE/WHEN, steps, ranking, marine, filtering
    verdict.js           the one-line answer (wording rules live here)
    time.js              local-time and countdown formatting
  hooks/useAlerts.js     fetch + auto-refresh + stale handling; useNow() ticking clock
  hooks/useResolvedIntent.js  runs the geocoding backup when the query's place wasn't resolved
  components/
    Verdict.jsx  Timeline.jsx  AlertCard.jsx  Footprint.jsx  HazardIcon.jsx  States.jsx
```

**Adding a query pattern:** add the regex to `query_format.regex` in `hyperdart.config.js`. If it introduces a new hazard word, add one line to `HAZARDS` in `lib/query.js` (`query` = words in the search, `events` = matching NWS event names).

## Libraries

React 19, MUI icons (`@mui/icons-material`), Vite, and the hyperDart template packages (`@hyperdart/frontend`, `@hyperdart/sandbox`). Everything else is hand-written: the map is plain SVG with a small projection, and the timeline is CSS. There is no map or chart library.

## Run it

```bash
npm install
npm start          # sandbox at http://localhost:5173/live-alerts
npm run build      # → dist/frontend/index.modern.js
```
Edit `searchData.json` to simulate other searches locally.

## How it was built (and use of AI)

Built in about 3.5 hours for the hyperDart hackathon, with **Claude Code (Anthropic)** as an AI pair-programmer.

- **AI-assisted:** comparing the three problem statements, the first draft of the code (query parsing, NWS client, components, styles), checking the live NWS responses, and this README.
- **Done by me:** choosing the problem and the approach (honesty-first, no backend), setting up the hyperDart template, testing every example query in the sandbox in light/dark and sidebar/mainline, reviewing the code until I could explain each part, and publishing.

<!-- Edit the "Done by me" list so it matches exactly what you did. -->
