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

class BottomNav extends Component {
	render({ hasGoodreads }) {
		return html`
		<div class='rfa-bottom-nav'>
			<a href="/app/"><ion-icon name="home"></ion-icon></a>
			<a href="/app/record"><ion-icon name="pencil"></ion-icon></a>
			<!-- <a href="/app/trends"><ion-icon name="bar-chart"></ion-icon></a> -->
			${ hasGoodreads ? html`<a href="/app/goodreads"><ion-icon name="book"></ion-icon></a>` : ""}
			<a href="/app/profile"><ion-icon name="person"></ion-icon></a>
			<a href="/app/help"><ion-icon name="help"></ion-icon></a>
		</div>
		`
	}
}

class Nav extends Component {
	render({ userID, hasGoodreads }) {
		if (!userID) {
			return html`
			<${BottomNav} hasGoodreads=${hasGoodreads} />
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
				<${BottomNav} hasGoodreads=${hasGoodreads} />
				<li><a href="/app/" class="rfa-nav-app-name">Read<em>Faster</em></a></li>
				<li><a href="/app/">Home</a></li>
				<li><a href="/app/record">Record</a></li>
				${ hasGoodreads ? html`<li><a href="/app/goodreads">Goodreads</a></li>` : ""}
				<li><a href="/app/profile">Profile</a></li>
				<li><a href="/app/help">Help</a></li>
			</ul>
			<${Hamburger}/>
			<div class="rfa-nav-separator" />
		`
	}
}

export default Nav;
