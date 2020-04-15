import { Component } from 'preact';
import { html } from 'htm/preact';
import Router from 'preact-router';
import './App.css'

const Home = () => (
	html`
	Home!
	Click <a href="/app/register">here</a> to register.
	`
)

class RegistrationForm extends Component {
	constructor() {
		super()
		this.state = { email: 'adsf', submitted: false }
	}

	onSubmit(e) {
		e.preventDefault();

		fetch("/api/register", {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: this.state.email,
				verify: document.getElementById('register-verify').value,
			}),
		});

		this.setState({ submitted: true })
	}

	onEmailInput(e) {
		this.setState({ email: e.target.value })
	}

	render() {
		return html`
			<form onSubmit=${this.onSubmit.bind(this)}>
				<input type=email onInput=${this.onEmailInput.bind(this)}>Email</input>
				<input type=hidden name=verify id="register-verify"></input>
				<button type="submit" disabled=${this.state.submitted}>Register</button>
			</form>
			<script id="register-grecaptcha" src="https://www.google.com/recaptcha/api.js?render=6Le3CekUAAAAAJx8XX3nmtv5JmtKuRfFlD6MADO_"></script>
			<script>
				var script = document.querySelector('#register-grecaptcha');
				script.addEventListener('load', function() {
					grecaptcha.ready(function() {
						grecaptcha.execute('6Le3CekUAAAAAJx8XX3nmtv5JmtKuRfFlD6MADO_', {action: 'register'}).then(function(token) {
							document.getElementById("register-verify").value = token;
						});
					});
				});
			</script>
		`
	}
}

class Register extends Component {
	render() {
		return html`
			<${RegistrationForm}/>
		`
	}
}

class App extends Component {
	render() {
		return html`
		<${Router}>
			<${Home} path="/app/" />
			<${Register} path="/app/register" />
		</${Router}>
		`;
	}
}

export default App;
