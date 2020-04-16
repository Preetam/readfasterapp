import { Component } from 'preact';
import { html } from 'htm/preact';
import { route } from 'preact-router';

class ReadingSession extends Component {
	delete(ts, refresh) {
		fetch("/api/reading_sessions/" + ts, {
			method: "DELETE"
		}).then(() => {
			refresh()
		})
	}

	render({ session, refresh }) {
		return html`
			<span><strong>${new Date(session.timestamp*1000).toLocaleString()}:</strong> ${session.duration} min
			- <a onclick=${(function() { this.delete(session.timestamp, refresh) }).bind(this)}>Delete</a></span>
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
			${this.state.sessions.map(session => html`
				<li><${ReadingSession} session=${session} refresh=${this.refreshList.bind(this)} /></li>
			`)}

			<h4>Add a session</h4>
			<${AddReadingSession} refresh=${this.refreshList.bind(this)} />
		`
	}
}

export default ReadingSessions;
