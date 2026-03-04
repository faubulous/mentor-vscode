import { container } from '../container';
import { SparqlQueryService } from '../services';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve(SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};