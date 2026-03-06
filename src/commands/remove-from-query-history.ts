import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/services/core';

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