import { ResourceDetail, ResourceId } from '../form-editor-model';

/**
 * Supplies the properties of resources to the list. Abstracted so the resource components can
 * be embedded outside the form editor, for example beside a query result, by providing the data
 * from somewhere other than a webview message channel.
 */
export interface IResourceDataService {
	/**
	 * Get the already loaded detail of a resource.
	 * @param id The resource identifier.
	 * @returns The detail, or `undefined` when it has not been loaded yet.
	 */
	get(id: ResourceId): ResourceDetail | undefined;

	/**
	 * Get the detail of a resource as delivered for the previous document version, so a card can
	 * keep showing its rows while the current version is loading. Optional: a service without
	 * versions never has stale data.
	 * @param id The resource identifier.
	 * @returns The stale detail, or `undefined` when there is none.
	 */
	getStale?(id: ResourceId): ResourceDetail | undefined;

	/**
	 * Ask for the detail of the given resources. Implementations are expected to coalesce
	 * concurrent requests and to notify subscribers once the data arrives.
	 * @param ids The resources to load.
	 */
	request(ids: ResourceId[]): void;

	/**
	 * Subscribe to changes of the loaded data.
	 * @param listener Invoked whenever loaded detail changed.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void;
}
