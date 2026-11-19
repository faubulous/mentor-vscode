/**
 * Names languages in the language of the editor.
 */
const LANGUAGE_NAMES = new Intl.DisplayNames(undefined, { type: 'language', fallback: 'none' });

/**
 * What the literal fields know about language tags: how a tag is written in its standard form, and
 * which language it names.
 */
export class LanguageTags {
	/**
	 * Write a language tag in the standard form of BCP 47: the language in lower case, a script in
	 * title case and a region in upper case, as `zh-Hant-TW` or `de-DE`; the subtags after a
	 * singleton, such as those of `x-` private use, in lower case. Only the case changes, so a tag
	 * stays the tag it is.
	 * @param tag The language tag.
	 * @returns The tag in standard form.
	 */
	static normalize(tag: string): string {
		let afterSingleton = false;

		return tag.split('-').map((subtag, index) => {
			const lower = subtag.toLowerCase();

			if (index === 0 || afterSingleton) {
				return lower;
			}

			if (subtag.length === 1) {
				afterSingleton = true;

				return lower;
			}

			if (subtag.length === 2) {
				return subtag.toUpperCase();
			}

			return subtag.length === 4 && /^[a-z]+$/i.test(subtag) ? lower[0].toUpperCase() + lower.slice(1) : lower;
		}).join('-');
	}

	/**
	 * The name of the language a tag names, in the language of the editor, such as German (Germany)
	 * for `de-DE`.
	 * @param tag The language tag.
	 * @returns The name, or `undefined` for a tag that names no language the editor knows.
	 */
	static nameOf(tag: string): string | undefined {
		try {
			return LANGUAGE_NAMES.of(tag);
		} catch {
			return undefined;
		}
	}
}
