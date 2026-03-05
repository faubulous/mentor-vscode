import { container, ISparqlQueryService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};