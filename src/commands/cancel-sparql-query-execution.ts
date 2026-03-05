import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SparqlQueryService } from '@src/services/shared/sparql-query-service';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<SparqlQueryService>(ServiceToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};