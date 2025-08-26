import { mentor } from '@/mentor';

export async function removeFromQueryHistory(documentIri: string) {
	const queryState = mentor.sparqlQueryService.getQueryState(documentIri);

	if (queryState) {
		mentor.sparqlQueryService.removeQueryState(queryState);
	}
}