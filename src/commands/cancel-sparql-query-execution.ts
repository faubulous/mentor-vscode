import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISparqlQueryService } from '@src/services/interface';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};