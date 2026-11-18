import { useMemo, useState } from 'react';
import { ResourceOptionData, TermSearchKind } from '../form-editor-model';
import { useTermOptions } from '../hooks/use-term-options';
import { Combobox, ComboboxOption, ComboboxProps } from './combobox';

/**
 * Properties of the {@link TermPicker} component.
 */
export interface TermPickerProps extends Omit<ComboboxProps<ResourceOptionData>, 'options' | 'ranked'> {
	/**
	 * The kind of terms offered; none are offered where it is absent, as for a field that takes text.
	 */
	kind?: TermSearchKind;

	/**
	 * The IRIs of terms not offered, such as the values a statement has already.
	 */
	exclude?: ReadonlySet<string>;
}

/**
 * A combobox offering the terms of a kind from the document, the vocabularies it declares and the
 * rest of the workspace, searched by the host as they are typed while the field has the focus and
 * ranked in that order. Each term shows its glyph, its label and its IRI, and the prefix picking it
 * declares where the document declares none for its namespace. The predicate field, the field of
 * a new value and the type of a new blank node all pick their terms with it.
 * @param props The kind of terms, the terms not offered, and the properties of the combobox.
 * @returns The picker.
 */
export function TermPicker(props: TermPickerProps): React.JSX.Element {
	const { kind, exclude, text, onFocus, onBlur, ...comboboxProps } = props;
	const [focused, setFocused] = useState(false);
	const terms = useTermOptions(kind, text, focused);
	const options = useMemo(() => _optionsOf(terms, exclude), [terms, exclude]);

	const handleFocus = (): void => {
		setFocused(true);
		onFocus?.();
	};

	const handleBlur = (): void => {
		setFocused(false);
		onBlur?.();
	};

	return <Combobox {...comboboxProps} text={text} options={options} ranked onFocus={handleFocus} onBlur={handleBlur} />;
}

/**
 * The options of terms: each by its label, with its IRI after it and the prefix picking it
 * declares, found by its prefixed name too, which the IRI shows already.
 * @param terms The terms, best first.
 * @param exclude The IRIs of terms not offered.
 * @returns The options.
 */
function _optionsOf(terms: readonly ResourceOptionData[], exclude: ReadonlySet<string> | undefined): ComboboxOption<ResourceOptionData>[] {
	return terms.filter(term => !exclude?.has(term.subject.value)).map(term => ({
		label: term.label,
		detail: term.subject.value,
		keywords: term.prefixedName,
		iconName: term.iconName,
		hint: term.missingPrefix ? `adds ${term.missingPrefix.prefix}:` : undefined,
		value: term
	}));
}
