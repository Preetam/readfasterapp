import { Component } from 'preact';
import { html } from 'htm/preact';
import * as d3 from "d3";
import './ReadingSessions.css';

class AddReadingSession extends Component {
	constructor() {
		super()
		this.state = { duration: 0 }
	}

	onDurationInput(e) {
		this.setState({ duration: parseInt(e.target.value) })
	}

	onSubmit(refresh) {
		return (function(e) {
			e.preventDefault();
			fetch("/api/reading_sessions", {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ "duration": this.state.duration * 60 }),
			}).then(() => {
				refresh()
			})
			this.setState({ duration: 0 })
			e.target.reset()
		}.bind(this))
	}

	render({ refresh }) {
		return html`
			<form onSubmit=${this.onSubmit(refresh)}>
				<input class="rfa-input" type=number placeholder="Duration (in min)" onInput=${this.onDurationInput.bind(this)}></input>
				<button class="rfa-button" type="submit">Submit</button>
			</form>
		`
	}
}

class RecordReadingSession extends Component {
	constructor() {
		super();
		// set initial time:
		this.state = {
			duration: 0,
			start: null,
			now: null,
			active: false,
		};
	}

	start() {
		const newState = {
			duration: this.state.duration,
			start: new Date(),
			now: new Date(),
			active: true,
		}
		this.setState(newState)
		this.timer = setInterval(() => {
			this.setState({
				now: new Date(),
			});
		}, 1000);

		window.localStorage.setItem("timer_state", JSON.stringify(newState));
	}

	pause() {
		const newState = {
			duration: this.state.duration + (this.state.now - this.state.start),
			start: null,
			now: null,
			active: false,
		}
		this.setState(newState)
		clearInterval(this.timer);

		window.localStorage.setItem("timer_state", JSON.stringify(newState));
	}

	reset() {
		this.setState({ duration: 0, start: null, now: null, active: false, })
		window.localStorage.removeItem("timer_state");
	}

	submit(refresh) {
		let totalDuration = this.state.duration;
		if (this.state.now && this.state.start) {
			totalDuration += (this.state.now - this.state.start);
		}
		const totalSeconds = Math.floor(totalDuration/1000);
		return (function(e) {
			e.preventDefault();
			fetch("/api/reading_sessions", {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ "duration": totalSeconds }),
			}).then(() => {
				refresh()
			})
			this.setState({ duration: 0, start: null, now: null, })
			window.localStorage.removeItem("timer_state");
			clearInterval(this.timer);
		}.bind(this))
	}

	componentWillMount() {
		// Check saved state.
		const encodedTimerState = window.localStorage.getItem("timer_state");
		if (!encodedTimerState) {
			return
		}
		let timerState = JSON.parse(encodedTimerState)
		if (timerState.start) {
			timerState.start = new Date(timerState.start)
		}
		if (timerState.now) {
			timerState.now = new Date(timerState.now)
		}
		if (timerState.active) {
			timerState.now = new Date();
			this.timer = setInterval(() => {
				this.setState({
					now: new Date(),
				});
			}, 1000);
		}
		this.setState(timerState);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
  
	render({refresh}, state) {
		let totalDuration = state.duration;
		if (state.now && state.start) {
			totalDuration += (state.now - state.start);
		}
		const totalSeconds = Math.floor(totalDuration/1000);
		const totalMinutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds%60;
		return html `
			<div class="rfa-timer">Duration: <strong>${totalMinutes < 10 ? '0'+totalMinutes : totalMinutes}:${seconds < 10 ? '0'+seconds : seconds}</strong></div>
			<button class='rfa-button' disabled=${state.active} onclick=${this.start.bind(this)}>Start</button>
			<button class='rfa-button' disabled=${!state.active} onclick=${this.pause.bind(this)}>Pause</button>
			<button class='rfa-button' onclick=${this.reset.bind(this)}>Reset</button>
			<button class='rfa-button' disabled=${totalSeconds < 5} onclick=${this.submit(refresh)}>Submit</button>
		`;
	}
}

class ReadingSessionsTable extends Component {
	render({ sessions, refresh }) {
		return html`
		<table class="rfa-reading-sessions-table" cellspacing=5>
			<tr>
				<th>When</th>
				<th>Duration (mm:ss)</th>
			</tr>
			${sessions.map(session => html`
				<${ReadingSessionsTableRow} session=${session} refresh=${refresh} />
			`)}
		</table>
		`
	}
}

class ReadingSessionsTableRow extends Component {
	delete(ts, refresh) {
		if (!confirm("Are you sure you want to delete this session?")) {
			return;
		}
		fetch("/api/reading_sessions/" + ts, {
			method: "DELETE"
		}).then(() => {
			refresh()
		})
	}

	render({ session, refresh }) {
		const totalSeconds = session.duration;
		const totalMinutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds%60;
		return html`
			<tr>
				<td>
					${new Date(session.timestamp*1000).toLocaleString()}
				</td>
				<td>
					${totalMinutes < 10 ? '0'+totalMinutes : totalMinutes}:${seconds < 10 ? '0'+seconds : seconds}
				</td>
				<td>
					<a class='rfa-button rfa-button-small' onclick=${(function() {
						this.delete(session.timestamp, refresh)
					}).bind(this)}>Delete</a>
				</td>
			</tr>
		`
	}
}

class ReadingSessionsChart extends Component {
	render({ sessions }) {
		const totalsByDay = d3.nest()
			.key(d => new Date(d.timestamp*1000).toLocaleDateString())
			.rollup(v => d3.sum(v, d => d.duration))
			.object(sessions)
		const margin = {top: 10, right: 40, bottom: 30, left: 40};
		const width = 640;
		const height = 160;

		console.log(totalsByDay)

		let data = [];
		for (let [key, value] of Object.entries(totalsByDay)) {
			data.push({
				date: new Date(key),
				duration: value/60,
			})
		}

		const x = d3.scaleTime()
			.domain([d3.min(data, d => d.date), d3.max(data, d => d.date)])
			.range([margin.left, width - margin.right]);

		const y = d3.scaleLinear()
			.domain([0, d3.max(data, d => d.duration)])
			.range([height - margin.bottom, margin.top]);

		return html`
		<div style="width: 100%;">
		<svg preserveAspectRatio="xMinYMax meet" viewBox="0 0 640 160" style="display: inline-block; width: 100%;">
			<g
				transform="translate(0,${height - margin.bottom})"
				ref=${g => d3.select(g).call(d3.axisBottom(x).ticks(3).tickFormat(d3.timeFormat("%Y-%m-%d")))}
				class="rfa-chart-axis" />
			${ data.map(d => (
				html`<rect class="rfa-chart-bar" x=${x(d.date)-1} y=${y(d.duration)} width=3 height=${height-y(d.duration)-margin.bottom} />`
			)) }
		  </svg>
		  </div>
		`;
	}
}

class ReadingSessionsGuidance extends Component {
	render({ sessions }) {
		const sessionsToday = sessions.filter(s => {
			if ((new Date(s.timestamp*1000)).toLocaleDateString() == (new Date()).toLocaleDateString()) {
				return true;
			}
		})

		const sessionsLast7Days = sessions.filter(s => {
			const timestamp1WeekAgo = (new Date()).getTime()/1000-(7*86400);
			if (s.timestamp >= timestamp1WeekAgo) {
				return true;
			}
		})

		let guidances = [];

		if (sessionsToday.length == 0) {
			guidances.push("You haven't read today. Try to get to 10 minutes!");
		} else {
			let avgOver7Days = (sessionsLast7Days.map(s => s.duration).reduce((total, d) => (total+d)))/7;
			const totalReadingSecondsToday = sessionsToday.map(s => s.duration).reduce((total, d) => (total+d));
			if (totalReadingSecondsToday/60 < 10) {
				guidances.push("Try to get to at least 10 minutes today.");
			}
			if (totalReadingSecondsToday < avgOver7Days) {
				guidances.push("Your total for today is under your weekly average. Try to beat it!");
			}
		}

		if (sessions.filter(s => s.duration < 120).length > 0) {
			guidances.push("Try to get at least 2 minutes every session!");
		}

		return html`<div class="rfa-guidance">
			${guidances.map(g => (
				html`<div class="rfa-guidance-line">💡 ${g}</div>`
			))}
		</div>`
	}
}

class ReadingSessionsSummary extends Component {
	render({ sessions }) {
		const sessionsToday = sessions.filter(s => {
			if ((new Date(s.timestamp*1000)).toLocaleDateString() == (new Date()).toLocaleDateString()) {
				return true;
			}
		})

		const sessionsLast7Days = sessions.filter(s => {
			const timestamp1WeekAgo = (new Date()).getTime()/1000-(7*86400);
			if (s.timestamp >= timestamp1WeekAgo) {
				return true;
			}
		})

		let avgOver7Days = 0;

		let oneWeekAvgHTML;
		if (sessionsLast7Days.length == 0) {
			oneWeekAvgHTML = html`
			<div class="rfa-summary-heading">No 7-day average</div>
			<div class="rfa-summary-time">Go read!</div>
			`
		} else {
			avgOver7Days = (sessionsLast7Days.map(s => s.duration).reduce((total, d) => (total+d)))/7;
			const totalMinutes = Math.floor(avgOver7Days / 60);
			const seconds = Math.floor(avgOver7Days)%60;
			oneWeekAvgHTML = html`
				<div class="rfa-summary-heading">7-day average</div>
				<div class="rfa-summary-time">${totalMinutes}m ${
					seconds < 10 ?
					'0' + seconds
					: seconds}s
				</div>
				<div>Over ${sessionsLast7Days.length} session${sessionsLast7Days.length > 1 ? 's' : ''}</div>`
		}

		let sessionsTodayHTML;
		if (sessionsToday.length == 0) {
			sessionsTodayHTML = html`
			<div class="rfa-summary-heading">Nothing recorded for today</div>
			<div class="rfa-summary-time">Go read!</div>
			`
		} else {
			const totalReadingSecondsToday = sessionsToday.map(s => s.duration).reduce((total, d) => (total+d));
			const totalMinutes = Math.floor(totalReadingSecondsToday / 60);
			const seconds = totalReadingSecondsToday%60;
			sessionsTodayHTML = html`
				<div class="rfa-summary-heading">Today</div>
				<div class="rfa-summary-time">${totalMinutes}m ${
					seconds < 10 ?
					'0' + seconds
					: seconds}s
				</div>
				<div>Over ${sessionsToday.length} session${sessionsToday.length > 1 ? 's' : ''}</div>
				${(function() {if (totalReadingSecondsToday > avgOver7Days) { return html`Beat your 7-day average!` }})()}
				`
		}

		return html`
			<div class="rfa-summary-section">${sessionsTodayHTML}</div>
			<div class="rfa-summary-section">${oneWeekAvgHTML}</div>
		`
	}
}

class ReadingSessions extends Component {
	constructor() {
		super()
		this.state = { loading: true, error: null, sessions: [] }
	}

	refreshList() {
		fetch("/api/reading_sessions").then(((response) => {
			if (response.ok) {
				return response.json()
			} else {
				this.setState({ error: response.status + ": " + response.statusText })
			}
		}).bind(this))
		.then(((data) => {
			data.sort(function(a, b) {
				return b.timestamp - a.timestamp;
			});
			this.setState({ loading: false, sessions: data });
		}).bind(this))
		.catch(((e) => {
			this.setState({ error: "Something went wrong." })
		}).bind(this))
	}

	componentWillMount() {
		this.refreshList()
	}

	render() {
		if (this.state.loading) {
			return html`
				<p>Loading...</p>
			`
		}
		if (this.state.error) {
			return html`
				<p>Something went wrong: ${this.state.error}</p>
			`
		}

		return html`
			<div class="rfa-summary">
				<${ReadingSessionsSummary} sessions=${this.state.sessions} />
			</div>
			<${ReadingSessionsGuidance} sessions=${this.state.sessions} />
			<${ReadingSessionsChart} sessions=${this.state.sessions} />
			<div>
				<h4>Record a session</h4>
				<p>Start recording a session.</p>
				<${RecordReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>

			<div>
				<h4>Recent sessions</h4>
				${this.state.sessions.length > 0 ?
					html`<${ReadingSessionsTable} sessions=${this.state.sessions} refresh=${this.refreshList.bind(this)} />` :
					html`<p>You haven’t recorded any sessions yet.</p>`}
			</div>

			<div>
				<h4>Add a session manually</h4>
				<${AddReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>
		`
	}
}

export default ReadingSessions;
