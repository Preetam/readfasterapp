import { Component } from 'preact';
import { html } from 'htm/preact';

class Help extends Component {
	render() {
		return html`
			<h2 id="getting-started">Getting Started</h2>
			<p>Welcome to ReadFaster!</p>
			<p><strong>Adding sessions:</strong> You can add sessions either manually at the bottom of the home page or using the timer.
			To use the timer, click "Start", start reading, and then click "Submit" once you’re done.
			You can switch tabs/apps or put your screen to sleep and the timer will keep going.</p>
			<p><strong>Removing sessions:</strong> You can delete sessions by clicking on the delete button in the “Recent sessions” section.</p>
			<h3>About your account</h3>
			<p>You can login using your email address and password, or just your email address. If you only enter
			your email address, you’ll get a login link in your email.</p>
			<p>You can add or change your password on the Profile page.</p>
			<p>Forgot your password? Login with the email link and update your password on the <a href="/app/profile">Profile</a> page.</p>
			<p></p>
			<h3>Staying informed</h3>
			<p>Updates about ReadFaster will be on Twitter: <a href="https://twitter.com/readfasterapp">@ReadFasterApp</a></p>
			<h2>Contact</h2>
			<p>If you have any questions, please send an email to <a href="mailto:contact@readfaster.app">contact@readfaster.app</a>.</p>
		`
	}
}

export default Help;
