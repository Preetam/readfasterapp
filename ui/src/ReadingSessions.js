import { Component } from 'preact';
import { html } from 'htm/preact';
import * as d3 from "d3";
import './ReadingSessions.css';
import Modal from './Modal'

class ReadingSessionsChart extends Component {
	render({ sessions }) {
		const totalsByDay = d3.nest()
			.key(d => new Date(d.timestamp*1000).toLocaleDateString())
			.rollup(v => d3.sum(v, d => d.duration))
			.object(sessions)
		const margin = {top: 10, right: 20, bottom: 50, left: 65};
		const width = 500;
		const height = 120;

		let data = [];
		for (let [key, value] of Object.entries(totalsByDay)) {
			data.push({
				date: new Date(key).getTime(),
				duration: value/60,
			})
		}

		const x = d3.scaleTime()
			.domain([d3.min(data, d => d.date)-86400000/2, d3.max(data, d => d.date)+86400000/2])
			.range([margin.left, width - margin.right]);

		const y = d3.scaleLinear()
			.domain([0, d3.max(data, d => d.duration)*1.05])
			.range([height - margin.bottom, margin.top]);

		return html`
		<div>
		<svg viewBox="0 0 ${width} ${height}" style="display: inline-block; width: 100%;">
			<g
				transform="translate(0,${height - margin.bottom})"
				ref=${g => {
					d3.select(g).call(d3.axisBottom(x).ticks(3).tickFormat(d3.timeFormat("%m/%d")))
				}}
				class="rfa-chart-axis" />
			<g
				transform="translate(${margin.left}, 0)"
				ref=${g => {
					d3.select(g).call(d3.axisLeft(y).ticks(3).tickFormat(d => d + " min"))
				}}
				class="rfa-chart-axis" />
			${ data.map(d => (
				html`<rect class="rfa-chart-bar" x=${x(d.date)-2} y=${y(d.duration)} width=5 height=${height-y(d.duration)-margin.bottom} />`
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

		if (sessionsLast7Days.length > 0) {
			const totalOver7Days = (sessionsLast7Days.map(s => s.duration).reduce((total, d) => (total+d)));
			const avgSessionDuration = totalOver7Days/sessionsLast7Days.length;
			if (avgSessionDuration < 120) {
				guidances.push("Try to get at least 2 minutes every session!");
			}
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
		fetch("/api/reading/sessions").then(((response) => {
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
			${ this.state.sessions.length > 0 ? (
				html`<${ReadingSessionsChart} sessions=${this.state.sessions} />`
			) : ""}
		`
	}
}

export default ReadingSessions;
