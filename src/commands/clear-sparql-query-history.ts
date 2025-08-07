import { mentor } from '../mentor';

export const clearSparqlQueryHistory = () => {
	mentor.sparqlQueryService.clearQueryHistory();
};