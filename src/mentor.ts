import * as n3 from 'n3';

export class mentor {
	/**
	 * Maps document URIs to a loaded documents.
	 */
	static documents: { [key: string]: DocumentContext } = {};
}

export class DocumentContext {
	/**
	 * The N3 store for the document.
	 */
	store: n3.Store;

	constructor(store: n3.Store) {
		this.store = store;
	}
}