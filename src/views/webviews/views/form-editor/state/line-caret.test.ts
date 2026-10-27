import { describe, expect, it } from 'vitest';
import { resolveLineCaret } from './line-caret';

describe('resolveLineCaret', () => {
	const line = 'rdfs:label "Tree"@en, "Baum"@de';

	it('places the caret at an offset, clamped to the line, or at its end', () => {
		expect(resolveLineCaret(line, 4)).toEqual({ start: 4, end: 4 });
		expect(resolveLineCaret(line, 99)).toEqual({ start: line.length, end: line.length });
		expect(resolveLineCaret(line, 'end')).toEqual({ start: line.length, end: line.length });
	});

	it('selects the text of the first literal, or puts the caret before its closing quote', () => {
		expect(resolveLineCaret(line, 'label')).toEqual({ start: 12, end: 16 });
		expect(resolveLineCaret(line, 'labelEnd')).toEqual({ start: 16, end: 16 });
		expect(resolveLineCaret('ex:p """long\ntext""" .', 'label')).toEqual({ start: 8, end: 17 });
		expect(resolveLineCaret('ex:p "esc\\"aped"', 'label')).toEqual({ start: 6, end: 15 });
	});

	it('resolves no selection when the line has no closed literal', () => {
		expect(resolveLineCaret('ex:p ex:a', 'label')).toBeUndefined();
		expect(resolveLineCaret('ex:p "open', 'labelEnd')).toBeUndefined();
	});
});
