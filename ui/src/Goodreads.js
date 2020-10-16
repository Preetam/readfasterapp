import { Component } from 'preact';
import { html } from 'htm/preact';
import './Goodreads.css';
import Modal from './Modal';

class GoodreadsProgressForm extends Component {
	constructor() {
		super()
		this.state = {
			percent: 0,
			updated: false,
		}
	}

	onPercentInput(e) {
		this.setState({ percent: parseInt(e.target.value) })
	}

	onSubmit(bookID) {
		return (function(e) {
			e.preventDefault();
			fetch(`/api/goodreads/books/${bookID}/progress?percent=${this.state.percent}`, {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
				},
			}).then(((response) => {
				if (!response.ok) {
					this.setState({ error: response.status + ": " + response.statusText })
				}
			}).bind(this))
			this.setState({ updated: true })
			e.target.reset()
		}.bind(this))
	}

	render() {
		const { book } = this.props

		if (this.state.error) {
			return html`
				<p>Something went wrong: ${this.state.error}</p>
			`
		}

		if (this.state.updated) {
			return html`
				<p>Updated!</p>
			`
		}

		return html`
		<div>
			Updating ${book.title}
		</div>
		<form onSubmit=${this.onSubmit(book.id)}>
			<input class="rfa-input" type="number" placeholder="Percent" onInput=${this.onPercentInput.bind(this)}>Progress</input>
			<button class="rfa-button" type="submit">Submit</button>
		</form>
		`
	}
}

class Goodreads extends Component {
	constructor() {
		super()
		this.state = {
			loading: true,
			error: null,
			books: [],
			modalBook: null,
		}
	}

	refreshList() {
		fetch("/api/goodreads/currently_reading").then(((response) => {
			if (response.ok) {
				return response.json()
			} else {
				throw response
			}
		}).bind(this))
		.then(((data) => {
			this.setState({ loading: false, books: data.books });
		}).bind(this))
		.catch(((e) => {
			this.setState({ loading: false, error: e.status + ": " + e.statusText })
		}).bind(this))
	}

	componentWillMount() {
		this.refreshList()
	}

	setModalBook(modalBook) {
		this.setState({ modalBook })
		console.log(this.state)
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

		let setModalBook = this.setModalBook.bind(this)
		return html`
			<div>
				<h2>Currently reading on Goodreads</h2>
				<${Modal} visible=${this.state.modalBook ? true : false} onclose=${() => (setModalBook(null))}>
					<h4>Set progress</h4>
					<${GoodreadsProgressForm} book=${this.state.modalBook}/>
				</${Modal}>

				${this.state.books.length > 0 ?
					this.state.books.map(b => html`
					<div class="rfa-goodreads-currently-reading">
						<img src="${b.image_url}"/>
						<div>
							<div class="rfa-goodreads-currently-reading-title">${b.title}</div>
							<div class="rfa-goodreads-currently-reading-authors">${b.authors.join(", ")}</div>
							<div class="rfa-goodreads-currently-reading-progress">
								${b.progress.page > 0 || b.progress.percent > 0 ? html`
								Progress: <strong>
									${b.progress.page > 0 ? html`Page ${b.progress.page} of ${b.num_pages}` :
									html`${b.progress.percent}%`}
								</strong> - ` : ''}
								<a href='#' onclick=${() => (setModalBook(b))}>Update progress</a>
							</div>
						</div>
					</div>
					`):
					html`<p>No books currently being read.</p>`}
			</div>
		`
	}
}

export default Goodreads;
