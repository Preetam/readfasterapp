import { Component } from 'preact';
import { html } from 'htm/preact';
import Router from 'preact-router';
import './App.css'

class UserInfo extends Component {
	constructor() {
		super()
		this.state = { userID: null }
	}

	componentWillMount() {
		fetch("/api/ping").then((response) => response.json())
		.then(((data) => {
			this.setState({ userID: data["user_id"] });
		}).bind(this))
	}

	render() {
		if (this.state.userID) {
			return html`<div>User ID: ${this.state.userID}</div>`
		}
	}
}

const Home = () => (
	html`
	Home!
	Click <a href="/app/register">here</a> to register.
	Click <a href="/app/login">here</a> to login.
	Click <a href="/app/logout">here</a> to logout.

	<${UserInfo}/>
	`
)

class RegistrationForm extends Component {
	constructor() {
		super()
		this.state = { email: '', submitted: false }
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

class LoginForm extends Component {
	constructor() {
		super()
		this.state = { email: '', submitted: false }
	}

	onSubmit(e) {
		e.preventDefault();

		fetch("/api/login", {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: this.state.email,
				verify: document.getElementById('login-verify').value,
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
				<input type=hidden name=verify id="login-verify"></input>
				<button type="submit" disabled=${this.state.submitted}>Login</button>
			</form>
			<script id="login-grecaptcha" src="https://www.google.com/recaptcha/api.js?render=6Le3CekUAAAAAJx8XX3nmtv5JmtKuRfFlD6MADO_"></script>
			<script>
				var script = document.querySelector('#login-grecaptcha');
				script.addEventListener('load', function() {
					grecaptcha.ready(function() {
						grecaptcha.execute('6Le3CekUAAAAAJx8XX3nmtv5JmtKuRfFlD6MADO_', {action: 'login'}).then(function(token) {
							document.getElementById("login-verify").value = token;
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

class Login extends Component {
	render() {
		return html`
			<${LoginForm}/>
		`
	}
}

class App extends Component {
	render() {
		return html`
		<${Router}>
			<${Home} path="/app/" />
			<${Register} path="/app/register" />
			<${Login} path="/app/login" />
		</${Router}>
		`;
	}
}

export default App;
