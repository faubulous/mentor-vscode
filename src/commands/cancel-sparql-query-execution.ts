import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/services/core';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};