/**
 * Properties of the {@link LanguageSwitch} component.
 */
export interface LanguageSwitchProps {
	/**
	 * The spelling of each language tag the document writes, by its lower case form.
	 */
	languageTags: Record<string, string>;

	/**
	 * The language the document is read in, in lower case, if one is chosen.
	 */
	activeLanguage?: string;

	/**
	 * Whether the values of every language are shown.
	 */
	allLanguages: boolean;

	/**
	 * Called to let the user choose the language, in Mentor's language quick pick.
	 */
	onPick: () => void;
}

/**
 * The language the form is read in, named in the toolbar. Choosing another opens Mentor's language
 * quick pick, as the language selection of the definition tree does, which also offers the values
 * of every language.
 * @param props The languages and the choice.
 * @returns The switch.
 */
export function LanguageSwitch({ languageTags, activeLanguage, allLanguages, onPick }: LanguageSwitchProps): React.JSX.Element {
	const label = allLanguages || !activeLanguage ? 'All languages' : _nameOf(languageTags[activeLanguage] ?? activeLanguage);

	return (
		<button type="button" className="language-switch" aria-label={`Language: ${label}`} title="Choose the language the values are shown in" onClick={onPick}>
			<span className="language-switch-label">{label}</span>
			<vscode-icon name="chevron-down" size={14}></vscode-icon>
		</button>
	);
}

/**
 * The name of a language in the language of the editor, or its tag where the name is not known.
 * @param tag The language tag, as the document spells it.
 * @returns The name.
 */
function _nameOf(tag: string): string {
	try {
		const name = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(tag);

		return name && name !== tag ? name : tag;
	} catch {
		return tag;
	}
}
