import { Component } from 'preact';
import { html } from 'htm/preact';
import './Modal.css';

export default class Modal extends Component {
	constructor({ onclose }) {
		super()
		this.state = { onclose }
	}
	render() {
		let children = this.props.children;
		if (!this.props.visible) {
			return
		}
		document.body.classList.add("modal-visible");
		let close = (() => {
			this.setState({ visible: false })
			document.body.classList.remove("modal-visible");
			if (this.state.onclose) {
				this.state.onclose()
			}
		}).bind(this)
		return html`
		<div class="rfa-modal-bg">
			<div class="rfa-modal">
				<div class="rfa-modal-close">
					<a onclick=${close}><ion-icon name="close"></ion-icon></a>
				</div>
				<div class="rfa-modal-content">
					${children}
				</div>
			</div>
		</div>
		`
	}
}
