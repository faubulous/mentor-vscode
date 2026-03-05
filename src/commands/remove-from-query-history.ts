import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SparqlQueryService } from '@src/services';

export const removeFromQueryHistory = {
	id: 'mentor.command.removeFromQueryHistory',
	handler: async (documentIri: string) => {
		const service = container.resolve<SparqlQueryService>(InjectionToken.SparqlQueryService);
		const queryState = service.getQueryStateForDocument(documentIri);

		if (queryState) {
			service.removeQueryState(queryState);
		}
	}
};