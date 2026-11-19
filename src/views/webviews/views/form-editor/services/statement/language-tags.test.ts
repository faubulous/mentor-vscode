import { describe, expect, it } from 'vitest';
import { LanguageTags } from './language-tags';

describe('LanguageTags', () => {
	it('writes a tag in standard form, changing only its case', () => {
		expect(LanguageTags.normalize('de-de')).toBe('de-DE');
		expect(LanguageTags.normalize('DE-de')).toBe('de-DE');
		expect(LanguageTags.normalize('zh-hant-tw')).toBe('zh-Hant-TW');
		expect(LanguageTags.normalize('es-419')).toBe('es-419');
		expect(LanguageTags.normalize('sl-rozaj-biske')).toBe('sl-rozaj-biske');
		expect(LanguageTags.normalize('en-US-x-TWAIN')).toBe('en-US-x-twain');
		expect(LanguageTags.normalize('iw')).toBe('iw');
	});

	it('names the language of a tag, and nothing for a tag it does not know', () => {
		expect(LanguageTags.nameOf('en')).toBe(new Intl.DisplayNames(undefined, { type: 'language' }).of('en'));
		expect(LanguageTags.nameOf('qqq')).toBeUndefined();
		expect(LanguageTags.nameOf('not a tag')).toBeUndefined();
	});
});
