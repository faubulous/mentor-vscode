import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { toValidEntries } from './validation-profile-paths-editor';

/**
 * The path lists the match counts are requested for combine the committed
 * entries with the text still sitting in an add box, so a pattern that shows
 * its own count is also reflected in the summary totals.
 */
describe('toValidEntries', () => {
	it('keeps matchable entries in order', () => {
		expect(toValidEntries(['**/*', 'models/*.ttl'])).toEqual(['**/*', 'models/*.ttl']);
	});

	it('includes a pending add-box value alongside the committed entries', () => {
		// The exclusion typed into the add box must count even before Enter
		// commits it — otherwise the summary reports the unexcluded total next to
		// an exclusion that visibly matches files.
		expect(toValidEntries(['**/*', ' drafts/** '])).toEqual(['**/*', 'drafts/**']);
	});

	it('drops blank and whitespace-only entries', () => {
		expect(toValidEntries(['**/*', '', '   ', undefined])).toEqual(['**/*']);
	});

	it('drops duplicates so a pending value equal to a committed one counts once', () => {
		expect(toValidEntries(['**/*', '**/*'])).toEqual(['**/*']);
		expect(toValidEntries(['models/*', ' models/* '])).toEqual(['models/*']);
	});

	it('drops entries that escape the workspace', () => {
		expect(toValidEntries(['../outside/**', 'models/*'])).toEqual(['models/*']);
	});

	it('keeps root-anchored entries, whose leading slash the matcher normalizes away', () => {
		expect(toValidEntries(['/models/*'])).toEqual(['/models/*']);
	});
});
