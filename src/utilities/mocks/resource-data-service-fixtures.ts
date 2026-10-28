import { ResourceDetail, ResourceId } from '@src/views/webviews/views/form-editor/form-editor-model';
import { IResourceDataService } from '@src/views/webviews/views/form-editor/services/resource-data-service.interface';

/**
 * A data service holding given details, which remembers what was asked of it.
 */
export interface ResourceDataServiceStub extends IResourceDataService {
	/**
	 * The identifiers requested so far, in order.
	 */
	requested: ResourceId[];
}

/**
 * Make a data service that holds the given details and loads nothing else.
 * @param details The details it holds.
 * @returns The service.
 */
export function createResourceDataServiceStub(details: readonly ResourceDetail[] = []): ResourceDataServiceStub {
	const byId = new Map(details.map(detail => [detail.id, detail]));
	const requested: ResourceId[] = [];

	return {
		requested,
		get: id => byId.get(id),
		request: ids => requested.push(...ids),
		subscribe: () => () => undefined
	};
}
