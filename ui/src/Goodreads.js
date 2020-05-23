import { Component } from 'preact';
import { html } from 'htm/preact';
import './Goodreads.css';

class Goodreads extends Component {
	constructor() {
		super()
		this.state = { loading: true, error: null, books: [] }
	}

	refreshList() {
		fetch("/api/goodreads/currently_reading").then(((response) => {
			if (response.ok) {
				return response.json()
			} else {
				this.setState({ error: response.status + ": " + response.statusText })
			}
		}).bind(this))
		.then(((data) => {
			this.setState({ loading: false, books: data.books });
		}).bind(this))
		.catch(((e) => {
			this.setState({ error: "Something went wrong." })
		}).bind(this))
	}

	componentWillMount() {
		this.refreshList()
	}

	render() {
		if (this.state.loading) {
			return html`
				<p>Loading...</p>
			`
		}
		if (this.state.error) {
			return html`
				<p>Something went wrong: ${this.state.error}</p>
			`
		}

		return html`
			<div>
				<h2>Currently reading on Goodreads</h2>
				${this.state.books.length > 0 ?
					this.state.books.map(b => html`
					<div class="rfa-goodreads-currently-reading">
						<img src="${b.image_url}"/>
						<div>
							<div class="rfa-goodreads-currently-reading-title">${b.title}</div>
							<div class="rfa-goodreads-currently-reading-authors">${b.authors.join(", ")}</div>
						</div>
					</div>`):
					html`<p>No books currently being read.</p>`}
			</div>
		`
	}
}

export default Goodreads;
