import { ResourceOptionData, TermSearchKind } from '../form-editor-model';

/**
 * Searches the terms the pickers of the form editor offer, and tells the languages they offer. The form editor implements it over the
 * webview message channel; another host can answer from anywhere else, and one that offers no
 * terms besides those of the document provides none.
 */
export interface ITermSearchService {
	/**
	 * Search the terms of a kind for typed text.
	 * @param kind The kind of terms.
	 * @param text The typed text.
	 * @param limit How many terms are returned at most.
	 * @returns The matching terms, best first.
	 */
	search(kind: TermSearchKind, text: string, limit: number): Promise<ResourceOptionData[]>;

	/**
	 * Tell the languages the workspace tags its literals with.
	 * @returns The language tags, the most used first.
	 */
	getWorkspaceLanguages(): Promise<string[]>;
}
