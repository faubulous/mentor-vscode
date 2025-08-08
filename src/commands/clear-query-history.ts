import { mentor } from '../mentor';

export const clearQueryHistory = () => {
	mentor.sparqlQueryService.clearQueryHistory();
};