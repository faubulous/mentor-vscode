import { mentor } from '../mentor';

export const cancelSparqlQueryExecution = {
	id: 'mentor.command.cancelSparqlQueryExecution',
	handler: (queryStateID: string) => {
		mentor.sparqlQueryService.cancelQuery(queryStateID);
	}
};