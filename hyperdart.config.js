import pkg from './package.json' with {type:'json'}

export default  {
	// import name from package.json
	name: pkg.name,
	triggers: {
		// From the problem statement, plus a few common hazard phrasings.
		keywords: [
			'weather alerts', 'weather alert', 'weather warnings', 'weather warning',
			'severe weather', 'tornado warning', 'flood warning', 'heat advisory',
			'winter storm warning', 'safety alerts',
			'flash flood warning', 'hurricane warning', 'tornado watch', 'red flag warning',
			'air quality alert', 'wind advisory', 'excessive heat warning', 'blizzard warning'
		]
		// in the future, we can add other types of triggers
	},
	query_format: {
		regex: [
			// --- Provided in the problem statement ---
			// "weather alerts in Houston", "severe weather warnings for Texas"
			'(weather|severe\\s+weather|safety|emergency)\\s+(alerts?|warnings?|advisories)\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			// "flood warning in Colorado", "heat advisory for Phoenix"
			'(tornado|flood|flash\\s+flood|heat|winter\\s+storm|storm|wind|fire\\s+weather|hurricane|air\\s+quality)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			// "is there a heat advisory in Phoenix"
			'is\\s+there\\s+(a|an|any)\\s+.*(warning|alert|watch|advisory)\\s+(in|for|near)\\s+HD_LOCATION(__\\w+)?.*',
			// "Houston weather alerts"
			'HD_LOCATION(__\\w+)?\\s+(weather\\s+)?(alerts?|warnings?|advisories).*',
			// "weather alerts near me"
			'(weather\\s+)?(alerts?|warnings?)\\s+(near|around)\\s+me.*',

			// --- Our additions ---
			// hyperDart matches from the start of the query, so allow extra words in front:
			// "live weather alerts in Alaska", "latest flood warnings for Colorado", "current alerts across Texas"
			'(.*\\s)?(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at|across)\\s+HD_LOCATION(__\\w+)?.*',
			// "live weather in Alaska", "current weather for Houston" (asking what's happening there now)
			'(.*\\s)?(live|current|latest)\\s+weather\\s+(in|for|at)\\s+HD_LOCATION(__\\w+)?.*',
			// "are there any alerts in Miami", "any warnings for Alaska"
			'(are\\s+there\\s+)?any\\s+(weather\\s+)?(alerts?|warnings?|watch(es)?|advisories)\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			// "tornado warning near me", "is there a flood warning near me"
			'(is\\s+there\\s+(a|an|any)\\s+)?.*(warning|alert|watch|advisory|advisories|warnings|alerts)\\s+(near|around)\\s+me.*',
			// "blizzard warning in Denver", "red flag warning for California"
			'(blizzard|ice\\s+storm|snow|excessive\\s+heat|extreme\\s+heat|red\\s+flag|tropical\\s+storm|thunderstorm|dust\\s+storm|freeze|frost|fog|rip\\s+current)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*'
		]
		// in the future, we can add other types of query formats
	},
	client: {
		// location of client side code
		// should point to pkg.umd - but currently that points to dist/index.umd.js
		location: pkg.module,
		// name of the UMD module
		moduleName: pkg.umdName || 'HD' + pkg.name,
		// baseURL is only used in local testing and ignored after publish
		// Optional: defaults to '/name' (the name of the component)
		baseURL: '/' + pkg.name,

	},
	format: {
		mainline: true,
		sidebar: true
		// "sidebar" / "mainline" / "ribbon" / "fullscreen"
	},
	permissions: {

	},
	info: {
		// key-values added here will be added to the compInfo section of searchData
	},
	github: "https://github.com/shubham-alyan24/live-alerts",
	demovideo: "https://youtu.be/gWPd6j-Rf9k",
	// The publish docs spell it "demoVideo"; the template's validator uses "demovideo". Keep both.
	demoVideo: "https://youtu.be/gWPd6j-Rf9k"
}
