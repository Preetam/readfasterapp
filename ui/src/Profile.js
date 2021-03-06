import { Component } from 'preact';
import { html } from 'htm/preact';
import CheckLogin from './CheckLogin';


class UpdatePasswordForm extends Component {
	constructor() {
		super()
		this.state = { password: '', submitted: false }
	}

	onSubmit(e) {
		e.preventDefault();

		fetch("/api/password", {
			method: "PUT",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				password: this.state.password,
			}),
		}).then((response) => {
			if (!response.ok) {
				this.setState({ error: response.status + ": " + response.statusText })
			}
		})
		.catch(((e) => {
			this.state.error = e
		}).bind(this))

		this.setState({ submitted: true })
	}

	onPasswordInput(e) {
		this.setState({ password: e.target.value })
	}

	render({ userEmail }) {
		if (this.state.submitted) {
			if (this.state.error) {
				return html`
					<p>Something went wrong! ${this.state.error}</p>
				`
			}
			return html`
				<p>Updated!</p>
			`
		}
		return html`
			<form onSubmit=${this.onSubmit.bind(this)}>
				<input class="rfa-input" name=email type=email value=${userEmail} disabled>Email</input>
				<input class="rfa-input" name=password type=password placeholder="Your new password" onInput=${this.onPasswordInput.bind(this)}>Password</input>
				<button class="rfa-button" type="submit" disabled=${this.state.submitted}>Update</button>
			</form>
		`
	}
}

class UpdatePassword extends Component {
	render({ userEmail }) {
		return html`
			<h3>Update password</h3>
			<${UpdatePasswordForm} userEmail=${userEmail} />
		`
	}
}

class Profile extends Component {
	render({ userEmail }) {
		if (!userEmail) {
			return html`
				<${CheckLogin} />
				`
		}
		return html`
			<h1>Profile</h1>
			<${UpdatePassword} userEmail=${userEmail} />
			<h2>Goodreads</h2>
			<p>Have a Goodreads account? <a href="/goodreads/auth">Connect it to ReadFaster.</a></p>
			<h2>Log out</h2>
			<p>Click <a href="/app/logout">here</a> to log out.</p>
		`
	}
}

export default Profile;
