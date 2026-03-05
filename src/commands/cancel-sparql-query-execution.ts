import { container } from '../service-container';
import { ServiceToken } from '@src/service-token';
import { SparqlQueryService } from '../services';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<SparqlQueryService>(ServiceToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};