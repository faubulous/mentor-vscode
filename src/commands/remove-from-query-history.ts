import { mentor } from '@/mentor';

export async function removeFromQueryHistory(index: number): Promise<void> {
	await mentor.sparqlQueryService.removeQueryStateAt(index);
}