import { BlankNode, NamedNode } from '@rdfjs/types';
import { PredicateRangeData, ResourceOptionData, TermSearchTargetType } from '../form-editor-model';

/**
 * Searches the terms the pickers of the form editor offer, and tells the languages they offer and
 * what values a predicate takes. The form editor implements it over the
 * webview message channel; another host can answer from anywhere else, and one that offers no
 * terms besides those of the document provides none.
 */
export interface ITermSearchService {
	/**
	 * Search the terms of a type for typed text.
	 * @param targetType The type of terms.
	 * @param text The typed text.
	 * @param limit How many terms are returned at most.
	 * @returns The matching terms, best first.
	 */
	search(targetType: TermSearchTargetType, text: string, limit: number): Promise<ResourceOptionData[]>;

	/**
	 * Tell the languages the workspace tags its literals with.
	 * @returns The language tags, the most used first.
	 */
	getWorkspaceLanguages(): Promise<string[]>;

	/**
	 * Tell what values a predicate takes for a resource, as the ranges and shapes of the workspace say.
	 * @param subject The resource.
	 * @param predicate The IRI of the predicate.
	 * @returns The range, or `undefined` where nothing tells it.
	 */
	getPredicateRange(subject: NamedNode | BlankNode, predicate: string): Promise<PredicateRangeData | undefined>;
}
