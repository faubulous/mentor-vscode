import { useMemo, useState } from 'react';
import { ResourceOptionData, TermSearchStatement, TermSearchTargetType } from '../form-editor-model';
import { useTermOptions } from '../hooks/use-term-options';
import { Combobox, ComboboxOption, ComboboxProps } from './combobox';

/**
 * Properties of the {@link TermPicker} component.
 */
export interface TermPickerProps extends Omit<ComboboxProps<ResourceOptionData>, 'options'> {
	/**
	 * The type of terms offered; none are offered where it is absent, as for a field that takes text.
	 */
	targetType?: TermSearchTargetType;

	/**
	 * The IRIs of terms not offered, such as the values a statement has already.
	 */
	exclude?: ReadonlySet<string>;

	/**
	 * The statement the terms are picked for, whose fitting terms are offered first.
	 */
	statement?: TermSearchStatement;
}

/**
 * A combobox offering the terms of a type from the document, the vocabularies it declares and the
 * rest of the workspace, searched by the host as they are typed while the field has the focus and
 * ranked in that order. Each term shows its glyph, its label and its IRI, and the prefix picking it
 * declares where the document declares none for its namespace. The predicate field, the field of
 * a new value and the type of a new blank node all pick their terms with it.
 * @param props The type of terms, the terms not offered, and the properties of the combobox.
 * @returns The picker.
 */
export function TermPicker(props: TermPickerProps): React.JSX.Element {
	const { targetType, exclude, statement, text, onFocus, onBlur, ...comboboxProps } = props;
	const [focused, setFocused] = useState(false);
	const terms = useTermOptions(targetType, text, focused, statement);
	const options = useMemo(() => _optionsOf(terms, exclude), [terms, exclude]);

	const handleFocus = (): void => {
		setFocused(true);
		onFocus?.();
	};

	const handleBlur = (): void => {
		setFocused(false);
		onBlur?.();
	};

	return <Combobox {...comboboxProps} text={text} options={options} onFocus={handleFocus} onBlur={handleBlur} />;
}

/**
 * The options of terms.
 * @param terms The terms, best first.
 * @param exclude The IRIs of terms not offered.
 * @returns The options.
 */
function _optionsOf(terms: readonly ResourceOptionData[], exclude: ReadonlySet<string> | undefined): ComboboxOption<ResourceOptionData>[] {
	return terms.filter(term => !exclude?.has(term.subject.value)).map(term => getTermOption(term, term));
}

/**
 * The option of a term, as every picker shows one: by its label, with its glyph before it, its
 * IRI after it and the prefix picking it declares. Its prefixed name is matched but not shown, as
 * the IRI says the same.
 * @param term The term.
 * @param value What picking the option yields.
 * @returns The option.
 */
export function getTermOption<T>(term: ResourceOptionData, value: T): ComboboxOption<T> {
	return {
		label: term.label,
		detail: term.subject.value,
		iconName: term.iconName,
		hint: term.missingPrefix ? `adds ${term.missingPrefix.prefix}:` : undefined,
		value
	};
}
