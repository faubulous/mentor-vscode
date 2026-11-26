import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { ResourceCardService } from '@src/services/resource/resource-card-service';
import { ServiceToken } from '@src/services/tokens';
import { PredicateRangeResolver } from '@src/services/vocabulary/predicate-range-resolver';
import { StoreIconResolver } from '@src/services/vocabulary/store-icon-resolver';

/**
 * Register the service of the resource cards over what a test registered, as Mentor registers it
 * over its own services: the store of the vocabulary repository, the document contexts its usages
 * are counted in, and the resolvers of glyphs and ranges, each where the test registered it.
 * @returns The service.
 */
export function registerResourceCardService(): ResourceCardService {
	const vocabulary = _resolveIfRegistered<VocabularyRepository>(ServiceToken.VocabularyRepository);
	const contexts = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const service = new ResourceCardService(
		vocabulary?.store,
		new ResourceReferenceProvider(contexts),
		_resolveIfRegistered<StoreIconResolver>(ServiceToken.StoreIconResolver),
		_resolveIfRegistered<PredicateRangeResolver>(ServiceToken.PredicateRangeResolver)
	);

	container.registerInstance(ServiceToken.ResourceCardService, service);

	return service;
}

/**
 * Resolve a service of the container where the test registered it.
 * @param token The token of the service.
 * @returns The service, or `undefined` where it is not registered.
 */
function _resolveIfRegistered<T>(token: ServiceToken): T | undefined {
	return container.isRegistered(token) ? container.resolve<T>(token) : undefined;
}
