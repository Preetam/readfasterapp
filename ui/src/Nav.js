import { Component } from 'preact';
import { html } from 'htm/preact';

class Nav extends Component {
	render({ userID }) {
		if (!userID) {
			return html`
			<ul>
				<li><a href="/app/">Home</a></li>
				<li><a href="/app/login">Login</a></li>
			</ul>
			`
		}
		return html`
			<ul>
				<li><a href="/app/">Home</a></li>
				<li><a href="/app/logout">Logout</a></li>
			</ul>
		`
	}
}

export default Nav;
