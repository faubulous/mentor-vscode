import { describe, it, expect } from 'vitest';
import { DataFactory } from 'n3';
import { LanguageTagUsageStats } from '@faubulous/mentor-rdf';
import { addLanguageTagUsage } from '@src/utilities/rdf';

describe('addLanguageTagUsage', () => {
	it('counts literals by their language tag and untagged literals under the empty tag', () => {
		const stats: LanguageTagUsageStats = {};

		addLanguageTagUsage(stats, DataFactory.literal('Thing', 'en'));
		addLanguageTagUsage(stats, DataFactory.literal('Ding', 'de'));
		addLanguageTagUsage(stats, DataFactory.literal('Object', 'en'));
		addLanguageTagUsage(stats, DataFactory.literal('42'));

		expect(stats).toEqual({ en: 2, de: 1, '': 1 });
	});

	it('ignores IRIs and blank nodes', () => {
		const stats: LanguageTagUsageStats = {};

		addLanguageTagUsage(stats, DataFactory.namedNode('http://example.org/a'));
		addLanguageTagUsage(stats, DataFactory.blankNode('b0'));

		expect(stats).toEqual({});
	});
});
