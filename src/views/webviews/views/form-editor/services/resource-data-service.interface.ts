import { BlankNode, NamedNode } from '@rdfjs/types';
import { ResourceCardBodyData, ResourceCardHeaderData } from '../form-editor-model';

/**
 * Supplies the properties of resources to the list. Abstracted so the resource components can
 * be embedded outside the form editor, for example beside a query result, by providing the data
 * from somewhere other than a webview message channel.
 */
export interface IResourceDataService {
	/**
	 * The document version the loaded statements belong to, which edits built from them are based on.
	 */
	readonly version: number;

	/**
	 * Get the statements about a resource loaded for the current snapshot.
	 * @param resource The resource.
	 * @returns The statements, or `undefined` while they are not loaded.
	 */
	getCardBody(resource: NamedNode | BlankNode): ResourceCardBodyData | undefined;

	/**
	 * Get the statements about a resource as delivered for the previous snapshot, so a card can keep
	 * showing its rows while those of the current one are loading. Optional: a service without
	 * snapshots never has stale statements.
	 * @param resource The resource.
	 * @returns The stale statements, or `undefined` when there are none.
	 */
	getStaleCardBody?(resource: NamedNode | BlankNode): ResourceCardBodyData | undefined;

	/**
	 * Get the card header of a resource the snapshot does not list, which the host sends along with
	 * its card body: a blank node written inside another resource, or a resource read from the store.
	 * Optional: a service whose resources are all listed in the snapshot has none.
	 * @param resource The resource.
	 * @returns The card header, or `undefined` when none came.
	 */
	getCardHeader?(resource: NamedNode | BlankNode): ResourceCardHeaderData | undefined;

	/**
	 * Ask for the statements about the given resources. Implementations are expected to coalesce
	 * concurrent requests and to notify subscribers once the data arrives.
	 * @param resources The resources to load.
	 */
	request(resources: (NamedNode | BlankNode)[]): void;

	/**
	 * Subscribe to changes of the loaded data.
	 * @param listener Invoked whenever loaded statements changed.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void;
}
