import { container, ISparqlQueryService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const removeFromQueryHistory = {
	id: 'mentor.command.removeFromQueryHistory',
	handler: async (documentIri: string) => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		const queryState = service.getQueryStateForDocument(documentIri);

		if (queryState) {
			service.removeQueryState(queryState);
		}
	}
};