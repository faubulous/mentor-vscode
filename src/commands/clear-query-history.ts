import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/services/core';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};