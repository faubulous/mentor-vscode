import { useMemo } from 'react';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';

/**
 * The value of the option that shows the values of every language. No language tag is spelled so.
 */
const ALL_LANGUAGES = '*';

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
	 * Called with the language tag chosen to read the document in.
	 */
	onSelectLanguage: (language: string) => void;

	/**
	 * Called when the values of every language are to be shown.
	 */
	onSelectAll: () => void;
}

/**
 * The language the form is read in, chosen among the languages the document writes, or all of
 * them. Choosing a language makes it the one Mentor reads the document in, as the language
 * selection of the definition tree does; showing all languages is a view of the form only.
 * @param props The languages and the choice.
 * @returns The switch.
 */
export function LanguageSwitch({ languageTags, activeLanguage, allLanguages, onSelectLanguage, onSelectAll }: LanguageSwitchProps): React.JSX.Element {
	const options = useMemo(() => _optionsOf(languageTags), [languageTags]);
	const selectRef = useVscodeElementRef<VscodeSingleSelect>('change', element => {
		if (element.value === ALL_LANGUAGES) {
			onSelectAll();
		} else {
			onSelectLanguage(element.value);
		}
	});

	return (
		<vscode-single-select ref={selectRef} className="language-switch" aria-label="Language" title="The language the values are shown in" value={allLanguages || !activeLanguage ? ALL_LANGUAGES : activeLanguage}>
			<vscode-option value={ALL_LANGUAGES}>All languages</vscode-option>
			{options.map(option => <vscode-option key={option.value} value={option.value}>{option.label}</vscode-option>)}
		</vscode-single-select>
	);
}

/**
 * The options of the languages, by their tags as the document spells them, each followed by the
 * name of the language where the browser knows it.
 * @param languageTags The spelling of each language tag, by its lower case form.
 * @returns The options, in the order of the tags.
 */
function _optionsOf(languageTags: Record<string, string>): { value: string; label: string }[] {
	const names = _languageNames();

	return Object.entries(languageTags)
		.sort(([, first], [, second]) => first.localeCompare(second))
		.map(([value, spelling]) => {
			const name = _nameOf(names, spelling);

			return { value, label: name ? `${spelling} — ${name}` : spelling };
		});
}

/**
 * The names of languages in the language of the editor, where the browser knows them.
 * @returns The names, or `undefined` without them.
 */
function _languageNames(): Intl.DisplayNames | undefined {
	try {
		return new Intl.DisplayNames([navigator.language], { type: 'language' });
	} catch {
		return undefined;
	}
}

/**
 * The name of a language, where its tag is one the names know.
 * @param names The names of languages.
 * @param tag The language tag.
 * @returns The name, or `undefined`.
 */
function _nameOf(names: Intl.DisplayNames | undefined, tag: string): string | undefined {
	try {
		const name = names?.of(tag);

		return name && name !== tag ? name : undefined;
	} catch {
		return undefined;
	}
}
