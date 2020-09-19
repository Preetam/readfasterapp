import { Component } from 'preact';
import { html } from 'htm/preact';
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
			fetch("/api/reading/sessions", {
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
			fetch("/api/reading/sessions", {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ "duration": totalSeconds }),
			}).then(() => {
				refresh()
			})
			this.setState({ duration: 0, start: null, now: null, active: false, })
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
		fetch("/api/reading/sessions/" + ts, {
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

class Record extends Component {
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
			<div>
				<h4>Record a session</h4>
				<p>Start recording a session.</p>
				<${RecordReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>

			<div>
				<h4>Add a session manually</h4>
				<${AddReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>

			<div>
				<h4>Recent sessions</h4>
				${this.state.sessions.length > 0 ?
					html`<${ReadingSessionsTable} sessions=${this.state.sessions} refresh=${this.refreshList.bind(this)} />` :
					html`<p>You haven’t recorded any sessions yet.</p>`}
			</div>
		`
	}
}

export default Record;
