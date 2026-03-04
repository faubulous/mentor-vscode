import { container } from '@src/container';
import { SparqlQueryService } from '@src/services';

export const removeFromQueryHistory = {
	id: 'mentor.command.removeFromQueryHistory',
	handler: async (documentIri: string) => {
		const service = container.resolve(SparqlQueryService);
		const queryState = service.getQueryStateForDocument(documentIri);

		if (queryState) {
			service.removeQueryState(queryState);
		}
	}
};