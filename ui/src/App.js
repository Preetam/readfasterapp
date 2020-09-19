import { Component } from 'preact';
import { html } from 'htm/preact';
import { Router, route} from 'preact-router';
import './App.css'
import Nav from './Nav.js'
import CheckLogin from './CheckLogin';
import ReadingSessions from './ReadingSessions';
import Record from './Record';
import Goodreads from './Goodreads';
import Profile from './Profile';
import Help from './Help';

class Home extends Component {
	render({ userID }) {
		if (!userID) {
			return html`
				<${CheckLogin} userID=${userID}/>
				`
		}
		return html`
			<div>
				<${ReadingSessions} />
			</div>
		`
	}
}

class RecordPage extends Component {
	render({ userID }) {
		if (!userID) {
			return html`
				<${CheckLogin} userID=${userID}/>
				`
		}
		return html`
			<div>
				<${Record} />
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
			<h3>Register</h3>
			<p>Registration is simple. All we need is your email address. You’ll get an email with a special link to verify your account.
			You can set a password in your profile page afterwards.</p>
			<form onSubmit=${this.onSubmit.bind(this)}>
				<input class="rfa-input" name=email type=email placeholder="Your email address" onInput=${this.onEmailInput.bind(this)}>Email</input>
				<input type=hidden name=verify id="register-verify"></input>
				<button class="rfa-button" type="submit" disabled=${this.state.submitted}>Register</button>
			</form>
			<p class="rfa-recaptcha-terms">This form is protected by reCAPTCHA and is subject to the Google <a href="//www.google.com/intl/en/policies/privacy/">Privacy Policy</a> and <a href="//www.google.com/intl/en/policies/terms/">Terms of Service</a>.</p>
			<p>By registering you agree to the terms and privacy policy described <a href="/terms.html">here</a>.</p>
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
		this.state = { email: '', password: '', submitted: false, completed: false, error: null, wrongCredentials: false }
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
				password: this.state.password,
				verify: document.getElementById('login-verify').value,
			}),
		}).then((response) => {
			if (!response.ok) {
				if (response.status == 401) {
					this.setState({
						wrongCredentials: true,
						error: "Incorrect email address or password.",
					})
				} else {
					this.setState({ error: response.status + ": " + response.statusText })
				}
			} else {
				this.setState({
					completed: true,
				})
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

	onPasswordInput(e) {
		this.setState({ password: e.target.value })
	}

	render() {
		if (this.state.submitted) {
			if (this.state.error) {
				return html`
					<p>Something went wrong! ${this.state.error}</p>
					${this.state.wrongCredentials ? html`
						<p>Check your credentials and try again.
						If you forgot your password, log in with just your email address.</p>
					` : ''}
				`
			}
			if (this.state.password != "") {
				if (this.state.completed) {
					window.location.href = "/app";
				}
				return html`<p>Logging you in!</p>`
			}
			return html`
				<p>Check your email for a magical login link.</p>
			`
		}
		return html`
			<h3>Login</h3>
			<form onSubmit=${this.onSubmit.bind(this)}>
			<input class='rfa-input' type=email name=email placeholder='Your email address' onInput=${this.onEmailInput.bind(this)}>Email</input>
			<input class='rfa-input' type=password name=password placeholder='Your password' onInput=${this.onPasswordInput.bind(this)}>Password</input>
				<input type=hidden name=verify id="login-verify"></input>
				<button class='rfa-button' type="submit" disabled=${this.state.submitted}>Login</button>
			</form>
			<p class="rfa-recaptcha-terms">This form is protected by reCAPTCHA and is subject to the Google <a href="//www.google.com/intl/en/policies/privacy/">Privacy Policy</a> and <a href="//www.google.com/intl/en/policies/terms/">Terms of Service</a>.</p>
			<p>Forgot your password? Leave it blank to get a magical login link in your email.</p>
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

class Footer extends Component {
	render() {
		return html`
		<div class="rfa-footer">
			<p>Copyright © 2020 ReadFaster.app. <a href="/legal.html">Legal</a></p>
		</div>
		`
	}
}


class App extends Component {
	constructor() {
		super()
		this.state = { loading: true, userID: null, userEmail: null, error: null }
	}

	componentWillMount() {
		fetch("/api/user").then(((response) => {
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
			this.setState({ loading: false, userID: data["user_id"], userEmail: data["email"], hasGoodreads: data["has_goodreads"] });
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
		<${Nav} userID=${this.state.userID} hasGoodreads=${this.state.hasGoodreads} />
		<div class="rfa-container">
		<${Router}>
			<${Home} path="/app/" userID=${this.state.userID} />
			<${RecordPage} path="/app/record" userID=${this.state.userID} />
			<${Goodreads} path="/app/goodreads" />
			<${Register} path="/app/register" />
			<${Login} path="/app/login" />
			<${Profile} path="/app/profile" userEmail=${this.state.userEmail} />
			<${Help} path="/app/help" />
		</${Router}>
		<${Footer}/>
		</div>
		`;
	}
}

export default App;
