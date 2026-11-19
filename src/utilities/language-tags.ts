/**
 * The names of languages by the locale they are written in, the runtime's under `undefined`; made
 * once per locale.
 */
const languageNamesByLocale = new Map<string | undefined, Intl.DisplayNames>();

/**
 * The shape of a language tag by the grammar of BCP 47: a language of two or three letters with up
 * to three extended subtags, a script, a region, variants, extensions and a private use part, each
 * optional; matched without regard to case.
 */
const LANGUAGE_TAG = /^[a-z]{2,3}(-[a-z]{3}){0,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?(-([a-z\d]{5,8}|\d[a-z\d]{3}))*(-[\da-wy-z](-[a-z\d]{2,8})+)*(-x(-[a-z\d]{1,8})+)?$/i;

/**
 * The languages of ISO 639-1, by their two-letter codes: the languages a tag most often names.
 */
const ISO_639_1_CODES: readonly string[] = (
	'aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu ' +
	'fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km ' +
	'kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om ' +
	'or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ' +
	'ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu'
).split(' ');

/**
 * The languages of ISO 639-1 the editor knows a name for, ordered by their names; read once.
 */
let commonLanguages: readonly string[] | undefined;

/**
 * What is known about language tags: how a tag is written in its standard form, whether a text is
 * one, which language it names, and which languages are commonly tagged.
 */
export class LanguageTags {
	/**
	 * The languages a tag most often names, those of ISO 639-1, ordered by their names in the
	 * locale of the runtime; those the editor has no name for are left out.
	 * @returns The language tags.
	 */
	static common(): readonly string[] {
		commonLanguages ??= ISO_639_1_CODES
			.map(code => ({ code, name: LanguageTags.nameOf(code) }))
			.filter(entry => entry.name !== undefined)
			.sort((a, b) => a.name!.localeCompare(b.name!))
			.map(entry => entry.code);

		return commonLanguages;
	}

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
	 * Indicate whether a text is a well-formed language tag, by the grammar of BCP 47, such as `de`,
	 * `de-CH` or `zh-Hant-TW`; a word such as `gmail` is none.
	 * @param text The text.
	 * @returns `true` for a well-formed tag.
	 */
	static isWellFormed(text: string): boolean {
		return LANGUAGE_TAG.test(text);
	}

	/**
	 * Indicate whether a language tag is an alias of another, as `ger` and `deu` are of `de`, by the
	 * canonical form the editor gives it; a tag that is no tag at all is none.
	 * @param tag The language tag.
	 * @returns `true` for an alias.
	 */
	static isAlias(tag: string): boolean {
		try {
			return Intl.getCanonicalLocales(tag)[0].toLowerCase() !== tag.toLowerCase();
		} catch {
			return false;
		}
	}

	/**
	 * The name of the language a tag names, such as German (Germany) for `de-DE`, in a locale or
	 * else in that of the runtime, which in a webview is the language of the editor.
	 * @param tag The language tag.
	 * @param locale The locale to name the language in, such as `vscode.env.language` on the host.
	 * @returns The name, or `undefined` for a tag that names no language the runtime knows.
	 */
	static nameOf(tag: string, locale?: string): string | undefined {
		try {
			return _languageNamesIn(locale).of(tag);
		} catch {
			return undefined;
		}
	}
}

/**
 * The names of languages in a locale, made on first use.
 * @param locale The locale, or `undefined` for that of the runtime.
 * @returns The names.
 */
function _languageNamesIn(locale: string | undefined): Intl.DisplayNames {
	let names = languageNamesByLocale.get(locale);

	if (!names) {
		names = new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' });
		languageNamesByLocale.set(locale, names);
	}

	return names;
}
