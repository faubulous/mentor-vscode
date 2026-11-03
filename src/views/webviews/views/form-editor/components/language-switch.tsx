import { useMemo } from 'react';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';

/**
 * The value of the option that shows the values of every language. No language tag is spelled so.
 */
const ALL_LANGUAGES = '*';

/**
 * The label of the option that shows the values of every language.
 */
const ALL_LANGUAGES_LABEL = 'All languages';

/**
 * The room the select takes beside its text: its padding, its border and its chevron.
 */
const SELECT_CHROME_WIDTH = '30px';

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
	const width = useMemo(() => _widthOf([ALL_LANGUAGES_LABEL, ...options.map(option => option.label)]), [options]);
	const selectRef = useVscodeElementRef<VscodeSingleSelect>('change', element => {
		if (element.value === ALL_LANGUAGES) {
			onSelectAll();
		} else {
			onSelectLanguage(element.value);
		}
	});

	// The width is set on a wrapper, as React passes a style object to a custom element as a
	// property, which the element does not take.
	return (
		<span className="language-switch" style={{ width }}>
			<vscode-single-select ref={selectRef} aria-label="Language" title="The language the values are shown in" value={allLanguages || !activeLanguage ? ALL_LANGUAGES : activeLanguage}>
				<vscode-option value={ALL_LANGUAGES}>{ALL_LANGUAGES_LABEL}</vscode-option>
				{options.map(option => <vscode-option key={option.value} value={option.value}>{option.label}</vscode-option>)}
			</vscode-single-select>
		</span>
	);
}

/**
 * The options of the languages, each labelled with the name of its language where the browser
 * knows it, and with its tag as the document spells it otherwise; sorted by their labels.
 * @param languageTags The spelling of each language tag, by its lower case form.
 * @returns The options.
 */
function _optionsOf(languageTags: Record<string, string>): { value: string; label: string }[] {
	const names = _languageNames();

	return Object.entries(languageTags)
		.map(([value, spelling]) => ({ value, label: _nameOf(names, spelling) ?? spelling }))
		.sort((first, second) => first.label.localeCompare(second.label));
}

/**
 * The width of the select that fits the longest of its labels.
 * @param labels The labels of the options.
 * @returns The width, as a CSS length.
 */
function _widthOf(labels: string[]): string {
	const length = Math.max(...labels.map(label => label.length));

	return `calc(${length}ch + ${SELECT_CHROME_WIDTH})`;
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
