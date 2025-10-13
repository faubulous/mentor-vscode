import { mentor } from '@src/mentor';

export const removeFromQueryHistory = {
	commandId: 'mentor.command.removeFromQueryHistory',
	handler: async (documentIri: string) => {
		const queryState = mentor.sparqlQueryService.getQueryState(documentIri);

		if (queryState) {
			mentor.sparqlQueryService.removeQueryState(queryState);
		}
	}
};