import * as n3 from 'n3';

export class mentor {
	/**
	 * Maps document URIs to a loaded documents.
	 */
	static contexts: { [key: string]: VocabularyContext } = {};
}

export class VocabularyContext {
	/**
	 * The N3 store for the document.
	 */
	store: n3.Store;

	constructor(store: n3.Store) {
		this.store = store;
	}
}