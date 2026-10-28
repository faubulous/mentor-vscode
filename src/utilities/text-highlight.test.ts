import { describe, expect, it } from 'vitest';
import { highlightSegments } from './text-highlight';

describe('highlightSegments', () => {
	it('marks every match, ignoring case, and keeps the text as written', () => {
		expect(highlightSegments('Adhesive cases are attached by adhesive', 'adhesive')).toEqual([
			{ text: 'Adhesive', match: true },
			{ text: ' cases are attached by ', match: false },
			{ text: 'adhesive', match: true }
		]);
	});

	it('leaves the text whole without a filter or a match', () => {
		expect(highlightSegments('awl', ' ')).toEqual([{ text: 'awl', match: false }]);
		expect(highlightSegments('awl', 'glue')).toEqual([{ text: 'awl', match: false }]);
	});
});
