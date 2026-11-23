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
	it('asks for the languages of the workspace and answers by the identifier of the request', async () => {
		const { service, posted } = createService();
		const search = service.search('datatype', '', 10);
		const languages = service.getWorkspaceLanguages();

		expect(posted[1]).toEqual({ id: 'WorkspaceLanguagesRequest', requestId: 2 });
		expect(service.accept({ id: 'WorkspaceLanguagesResponse', requestId: 2, languages: ['de', 'fr'] })).toBe(true);
		expect(await languages).toEqual(['de', 'fr']);

		service.accept({ id: 'TermSearchResult', requestId: 1, options: [] });

		expect(await search).toEqual([]);
	});

	it('sends each search with an identifier of its own and answers it by that identifier', async () => {
		const { service, posted } = createService();
		const first = service.search('predicate', 'la', 10);
		const second = service.search('class', 'tr', 5);

		expect(posted).toEqual([
			{ id: 'TermSearch', requestId: 1, targetType: 'predicate', text: 'la', limit: 10 },
			{ id: 'TermSearch', requestId: 2, targetType: 'class', text: 'tr', limit: 5 }
		]);

		expect(service.accept({ id: 'TermSearchResult', requestId: 2, options: [option('Tree')] })).toBe(true);
		expect(service.accept({ id: 'TermSearchResult', requestId: 1, options: [option('label')] })).toBe(true);
		expect(await first).toEqual([option('label')]);
		expect(await second).toEqual([option('Tree')]);
	});

	it('asks what values a predicate takes for a resource and answers by the identifier of the request', async () => {
		const { service, posted } = createService();
		const subject = RdfDataFactory.namedNode('http://example.org/Account');
		const range = service.getPredicateRange(subject, 'http://example.org/endsAt');

		expect(posted).toEqual([{ id: 'PredicateRangeRequest', requestId: 1, subject, predicate: 'http://example.org/endsAt' }]);
		expect(service.accept({ id: 'PredicateRangeResponse', requestId: 1, range: { type: 'literal', datatype: 'http://www.w3.org/2001/XMLSchema#dateTime', source: 'range' } })).toBe(true);
		expect(await range).toEqual({ type: 'literal', datatype: 'http://www.w3.org/2001/XMLSchema#dateTime', source: 'range' });
	});

	it('leaves the other messages of the host to others', () => {
		const { service } = createService();

		expect(service.accept({ id: 'EditApplied', editId: 'edit-1', version: 2 })).toBe(false);
	});
});
