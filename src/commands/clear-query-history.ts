import { mentor } from '../mentor';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		mentor.sparqlQueryService.clearQueryHistory();
	}
};