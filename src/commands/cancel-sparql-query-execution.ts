import { container } from '../container';
import { InjectionToken } from '@src/injection-token';
import { SparqlQueryService } from '../services';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		const service = container.resolve<SparqlQueryService>(InjectionToken.SparqlQueryService);
		service.cancelQuery(queryStateID);
	}
};