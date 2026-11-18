// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceOptionData } from '../form-editor-model';
import { ITermSearchService } from '../services/term-search-service.interface';
import { FormEditorContext } from '../state/form-editor-context';
import { useTermOptions } from './use-term-options';

/**
 * A search the host has not answered yet.
 */
interface OpenSearch {
	/**
	 * The text searched for.
	 */
	text: string;

	/**
	 * Answers the search.
	 */
	answer: (options: ResourceOptionData[]) => void;
}

/**
 * An option for a term of the example namespace, labelled by its local name.
 * @param name The local name.
 * @param source Where the term comes from.
 * @returns The option.
 */
function option(name: string, source: ResourceOptionData['source'] = 'workspace'): ResourceOptionData {
	return { subject: RdfDataFactory.namedNode(`http://example.org/${name}`), label: name, source };
}

/**
 * Render the hook over a search that the test answers.
 * @param initial The typed text and whether the picker is in use.
 * @returns The hook and the open searches.
 */
async function renderOptions(initial: { text: string; active: boolean }) {
	const searches: OpenSearch[] = [];
	const termSearch: ITermSearchService = {
		search: (_kind, text) => new Promise(answer => searches.push({ text, answer })),
		getWorkspaceLanguages: async () => []
	};
	const hook = renderHook(({ text, active }) => useTermOptions('predicate', text, active), {
		initialProps: initial,
		wrapper: ({ children }) => <FormEditorContext.Provider value={{ readOnly: false, namespaces: [], languageTags: {}, termSearch }}>{children}</FormEditorContext.Provider>
	});

	await act(async () => undefined);

	return { hook, searches };
}

/**
 * Type a text into the picker.
 * @param hook The hook.
 * @param text The text.
 */
async function type(hook: Awaited<ReturnType<typeof renderOptions>>['hook'], text: string): Promise<void> {
	await act(async () => hook.rerender({ text, active: true }));
}

describe('useTermOptions', () => {
	it('searches at once, and only while the picker is in use', async () => {
		const { hook, searches } = await renderOptions({ text: '', active: false });

		expect(searches).toEqual([]);

		await type(hook, 'la');

		expect(searches.map(search => search.text)).toEqual(['la']);

		await act(async () => searches[0].answer([option('label')]));

		expect(hook.result.current).toEqual([option('label')]);
	});

	it('narrows the last answer to every keystroke at once, ranked as the host ranks it', async () => {
		const { hook, searches } = await renderOptions({ text: '', active: true });

		await act(async () => searches[0].answer([option('comment', 'document'), option('labelOf'), option('label')]));
		await type(hook, 'lab');

		expect(hook.result.current.map(term => term.label)).toEqual(['label', 'labelOf']);

		await type(hook, 'labelo');

		expect(hook.result.current.map(term => term.label)).toEqual(['labelOf']);
	});

	it('sends one search at a time, and then only the text typed last', async () => {
		const { hook, searches } = await renderOptions({ text: 'l', active: true });

		await type(hook, 'la');
		await type(hook, 'lab');

		expect(searches.map(search => search.text)).toEqual(['l']);

		await act(async () => searches[0].answer([option('label')]));

		expect(searches.map(search => search.text)).toEqual(['l', 'lab']);

		await act(async () => searches[1].answer([option('label'), option('labelOf')]));

		expect(hook.result.current.map(term => term.label)).toEqual(['label', 'labelOf']);
	});
});
