import { mentor } from '../mentor';

export const clearQueryHistory = {
	commandId: 'mentor.command.clearQueryHistory',
	handler: () => {
		mentor.sparqlQueryService.clearQueryHistory();
	}
};