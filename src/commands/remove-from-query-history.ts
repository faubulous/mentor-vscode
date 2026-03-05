import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SparqlQueryService } from '@src/services';

export const removeFromQueryHistory = {
	id: 'mentor.command.removeFromQueryHistory',
	handler: async (documentIri: string) => {
		const service = container.resolve<SparqlQueryService>(ServiceToken.SparqlQueryService);
		const queryState = service.getQueryStateForDocument(documentIri);

		if (queryState) {
			service.removeQueryState(queryState);
		}
	}
};