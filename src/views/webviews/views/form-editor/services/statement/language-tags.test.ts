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

	it('knows the common languages, ordered by their names', () => {
		const common = LanguageTags.common();
		const names = common.map(tag => LanguageTags.nameOf(tag)!);

		expect(common.length).toBeGreaterThan(150);
		expect(common).toContain('de');
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it('tells a well-formed language tag from other text', () => {
		expect(['de', 'de-CH', 'zh-hant-tw', 'es-419', 'sl-rozaj-biske', 'en-US-x-twain', 'de-DE-u-co-phonebk'].every(tag => LanguageTags.isWellFormed(tag))).toBe(true);
		expect(['gmail', 'd', 'de-', 'de_CH', 'de CH', ''].some(tag => LanguageTags.isWellFormed(tag))).toBe(false);
	});

	it('tells an alias of a language tag', () => {
		expect(LanguageTags.isAlias('ger')).toBe(true);
		expect(LanguageTags.isAlias('de-ch')).toBe(false);
		expect(LanguageTags.isAlias('xyz')).toBe(false);
		expect(LanguageTags.isAlias('not a tag')).toBe(false);
	});
});
