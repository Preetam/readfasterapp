import { Component } from 'preact';
import { route } from 'preact-router';

export default class CheckLogin extends Component {
	componentWillMount() {
		if (!this.props.userID) {
			route("/app/login", true)
		}
	}

	render() {
		return null;
	}
}
