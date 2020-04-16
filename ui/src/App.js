import { Component } from 'preact';
import { html } from 'htm/preact';
import Router from 'preact-router';
import './App.css'
import Nav from './Nav.js'
import CheckLogin from './CheckLogin';
import ReadingSessions from './ReadingSessions';

class Home extends Component {
	render({ userID }) {
		return html`
			<${CheckLogin} userID=${userID}/>
			<div>
				<h2>Home</h2>
				<${ReadingSessions} />
			</div>
		`
	}
}

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
		this.state = { email: '', submitted: false, error: null }
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

	onEmailInput(e) {
		this.setState({ email: e.target.value })
	}

	render() {
		if (this.state.submitted) {
			if (this.state.error) {
				return html`
					<p>Something went wrong! ${this.state.error}</p>
				`
			}
			return html`
				<p>Check your email for a magical login link.</p>
			`
		}
		return html`
			<h3>Login</h3>
			<form onSubmit=${this.onSubmit.bind(this)}>
				<input class='rfa-input' type=email placeholder='Your email address' onInput=${this.onEmailInput.bind(this)}>Email</input>
				<input type=hidden name=verify id="login-verify"></input>
				<button class='rfa-button' type="submit" disabled=${this.state.submitted}>Login</button>
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
	constructor() {
		super()
		this.state = { loading: true, userID: null, error: null }
	}

	componentWillMount() {
		fetch("/api/ping").then(((response) => {
			if (response.ok) {
				return response.json()
			} else {
				console.log(response.status)
				if (response.status == 401) {
					this.setState({ loading: false })
					return response;
				}
				this.setState({ loading: false, error: response.status + ": " + response.statusText })
				return response
			}
		}).bind(this))
		.then(((data) => {
			this.setState({ loading: false, userID: data["user_id"] });
		}).bind(this))
		.catch(((e) => {
			this.setState({ loading: false, error: "Something went wrong." })
		}).bind(this))
	}

	render() {
		if (this.state.loading) {
			return html`
				<div><h1>ReadFaster</h1></div>
				<p>Loading...</p>
			`
		}
		if (this.state.error) {
			return html`
				<div><h1>ReadFaster</h1></div>
				<p>Something went wrong: ${this.state.error}</p>
			`
		}
		return html`
		<div><h1>ReadFaster</h1></div>
		<${Nav} userID=${this.state.userID} />
		<${Router}>
			<${Home} path="/app/" userID=${this.state.userID} />
			<${Register} path="/app/register" />
			<${Login} path="/app/login" />
		</${Router}>
		`;
	}
}

export default App;
