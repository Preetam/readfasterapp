import { Component } from 'preact';
import { html } from 'htm/preact';

class ReadingSession extends Component {
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
		return html`
			<span style="line-height: 40px">
				<a class='rfa-button rfa-button-small' onclick=${(function() { this.delete(session.timestamp, refresh) }).bind(this)}>Delete</a>
				<strong>${new Date(session.timestamp*1000).toLocaleString()}:</strong> ${session.duration} min
			</span>
		`
	}
}

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
				body: JSON.stringify({ "duration": this.state.duration }),
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
	  };
	}

	start() {
		this.setState({
		  start: new Date(),
		now: new Date(),
	  })
	  this.timer = setInterval(() => {
		this.setState({
				  now: new Date(),
		});
	  }, 1000);
	}

	stop() {
		this.setState({
		  duration: this.state.duration + (this.state.now - this.state.start),
		start: null,
		now: null,
	  })
		clearInterval(this.timer);
	}

	reset() {
		this.setState({ duration: 0, start: null, now: null, })
	}

	submit(refresh) {
		return (function(e) {
			e.preventDefault();
			const totalMinutes = Math.floor(totalSeconds / 60);
			fetch("/api/reading_sessions", {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ "duration": totalMinutes }),
			}).then(() => {
				refresh()
			})
			this.setState({ duration: 0 })
			e.target.reset()
		}.bind(this))
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
			<div>Duration: <strong>${totalMinutes < 10 ? '0'+totalMinutes : totalMinutes}:${seconds < 10 ? '0'+seconds : seconds}</strong></div>
			<a class='rfa-button' onclick=${this.start.bind(this)}>Start</a>
			<a class='rfa-button' onclick=${this.stop.bind(this)}>Stop</a>
			<a class='rfa-button' onclick=${this.reset.bind(this)}>Reset</a>
			<a class='rfa-button' onclick=${this.submit(refresh)}>Submit</a>
		`;
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
			<h3>Sessions</h3>
			<div>
				<h4>Record a session</h4>
				<p>Start recording a session.</p>
				<${RecordReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>

			<div>
				<h4>Previous sessions</h4>
				${this.state.sessions.map(session => html`
					<li><${ReadingSession} session=${session} refresh=${this.refreshList.bind(this)} /></li>
				`)}
			</div>

			<div>
				<h4>Add a session</h4>
				<${AddReadingSession} refresh=${this.refreshList.bind(this)} />
			</div>
		`
	}
}

export default ReadingSessions;
