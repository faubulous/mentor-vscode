import { describe, expect, it, vi } from 'vitest';
import { ResourceOptionData } from '../form-editor-model';
import { ITermSearchService } from './term-search-service.interface';
import { SequentialTermSearch } from './sequential-term-search';

/**
 * A search over a service whose searches the test answers.
 * @returns The search, the texts sent, the answers taken and a way to answer the oldest search.
 */
function createSearch() {
	const answers: ((options: ResourceOptionData[]) => void)[] = [];
	const sent: string[] = [];
	const service: ITermSearchService = {
		search: (_kind, text) => {
			sent.push(text);

			return new Promise(answer => answers.push(answer));
		}
	};
	const onAnswer = vi.fn();
	const search = new SequentialTermSearch(service, 'predicate', 10, onAnswer);
	const answerNext = async () => {
		answers.shift()!([]);
		await Promise.resolve();
	};

	return { search, sent, onAnswer, answerNext };
}

describe('SequentialTermSearch', () => {
	it('sends the text typed last once the search on its way is answered, and none it skipped', async () => {
		const { search, sent, onAnswer, answerNext } = createSearch();

		search.request('l');
		search.request('la');
		search.request('lab');

		expect(sent).toEqual(['l']);

		await answerNext();

		expect(onAnswer).toHaveBeenCalledWith('l', []);
		expect(sent).toEqual(['l', 'lab']);
	});

	it('does not search the text on its way again', async () => {
		const { search, sent, answerNext } = createSearch();

		search.request('l');
		search.request('l');
		await answerNext();

		expect(sent).toEqual(['l']);
	});

	it('stops answering once disposed', async () => {
		const { search, sent, onAnswer, answerNext } = createSearch();

		search.request('l');
		search.request('la');
		search.dispose();
		await answerNext();

		expect(onAnswer).not.toHaveBeenCalled();
		expect(sent).toEqual(['l']);
	});
});
