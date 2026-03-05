import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SparqlQueryService } from '@src/services/shared/sparql-query-service';

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