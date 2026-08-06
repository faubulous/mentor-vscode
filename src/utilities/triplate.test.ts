import { describe, it, expect } from 'vitest';
import { getContentStartOffset } from './triplate';

describe('getContentStartOffset', () => {
	it('returns 0 when there is no frontmatter', () => {
		expect(getContentStartOffset('SELECT * WHERE {}')).toBe(0);
	});

	it('returns the offset just past the closing --- line', () => {
		const text = '---\nparams { type: iri }\n---\nSELECT 1';
		expect(text.slice(getContentStartOffset(text))).toBe('SELECT 1');
	});

	it('handles a frontmatter block with no trailing newline', () => {
		const text = '---\nparams { type: iri }\n---';
		expect(getContentStartOffset(text)).toBe(text.length);
	});
});
