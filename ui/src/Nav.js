import { Component } from 'preact';
import { html } from 'htm/preact';
import './Nav.css'

class Hamburger extends Component {
	render() {
		return html`
			<div class="rfa-nav-hamburger" onclick=${function() {
				document.getElementsByClassName("rfa-nav")[0].classList.toggle("active");
				document.getElementsByClassName("rfa-nav-hamburger")[0].classList.toggle("active");
			}}>
				<div class="rfa-nav-hamburger-bar1" />
				<div class="rfa-nav-hamburger-bar2" />
			</div>
		`
	}
}

class Nav extends Component {
	render({ userID, hasGoodreads }) {
		if (!userID) {
			return html`
			<ul class="rfa-nav">
				<li><a href="/app/" class="rfa-nav-app-name">Read<em>Faster</em></a></li>
				<li><a href="/app/">Home</a></li>
				<li><a href="/app/login">Login</a></li>
				<li><a href="/app/register">Register</a></li>
				<li><a href="/app/help">Help</a></li>
			</ul>
			<${Hamburger}/>
			<div class="rfa-nav-separator" />
			`
		}
		return html`
			<ul class="rfa-nav">
				<li><a href="/app/" class="rfa-nav-app-name">Read<em>Faster</em></a></li>
				<li><a href="/app/">Home</a></li>
				${ hasGoodreads ? html`<li><a href="/app/goodreads">Goodreads</a></li>` : ""}
				<li><a href="/app/profile">Profile</a></li>
				<li><a href="/app/help">Help</a></li>
				<li><a href="/app/logout">Logout</a></li>
			</ul>
			<${Hamburger}/>
			<div class="rfa-nav-separator" />
		`
	}
}

export default Nav;
