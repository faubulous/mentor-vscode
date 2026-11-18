import { describe, expect, it } from 'vitest';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { ResourceOptionData } from '../form-editor-model';
import { TermSearchService } from './term-search-service';

/**
 * An option for a term of the example namespace.
 * @param name The local name.
 * @returns The option.
 */
function option(name: string): ResourceOptionData {
	return { subject: RdfDataFactory.namedNode(`http://example.org/${name}`), label: name, source: 'document' };
}

/**
 * Create a service recording the messages it posts.
 * @returns The service and the posted messages.
 */
function createService(): { service: TermSearchService; posted: FormEditorWebviewMessage[] } {
	const posted: FormEditorWebviewMessage[] = [];

	return { service: new TermSearchService(message => posted.push(message)), posted };
}

describe('TermSearchService', () => {
	it('sends each search with an identifier of its own and answers it by that identifier', async () => {
		const { service, posted } = createService();
		const first = service.search('predicate', 'la', 10);
		const second = service.search('class', 'tr', 5);

		expect(posted).toEqual([
			{ id: 'TermSearch', requestId: 1, kind: 'predicate', text: 'la', limit: 10 },
			{ id: 'TermSearch', requestId: 2, kind: 'class', text: 'tr', limit: 5 }
		]);

		expect(service.accept({ id: 'TermSearchResult', requestId: 2, options: [option('Tree')] })).toBe(true);
		expect(service.accept({ id: 'TermSearchResult', requestId: 1, options: [option('label')] })).toBe(true);
		expect(await first).toEqual([option('label')]);
		expect(await second).toEqual([option('Tree')]);
	});

	it('leaves the other messages of the host to others', () => {
		const { service } = createService();

		expect(service.accept({ id: 'EditApplied', editId: 'edit-1', version: 2 })).toBe(false);
	});
});
