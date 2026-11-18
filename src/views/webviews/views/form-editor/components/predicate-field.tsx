import { useEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { ResourceOptionData } from '../form-editor-model';
import { useTermOptions } from '../hooks/use-term-options';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { Combobox, ComboboxOption } from './combobox';

/**
 * Properties of the {@link PredicateField} component.
 */
export interface PredicateFieldProps {
	/**
	 * Edits the row.
	 */
	editor: StatementRowEditor;

	/**
	 * The state of the row.
	 */
	state: StatementRowState;

	/**
	 * The label of the predicate, shown while the field does not have the focus.
	 */
	label: string;

	/**
	 * Whether the field takes the focus when it appears, as in a row opened by Add property.
	 */
	autoFocus?: boolean;
}

/**
 * The predicate of an edited row: its label at rest, and how it is written while the field has
 * the focus. A row for a new statement shows what is typed at rest too, unless its predicate is
 * given, as the label row of a card without a label has. While the field has the focus it offers
 * the predicates of the document and the workspace that match the typed text, those of a new
 * statement as soon as it takes the focus. The predicate picked or typed is taken when the field
 * is left or Enter is pressed in it.
 * @param props The row, the label of its predicate and whether the field takes the focus.
 * @returns The field.
 */
export function PredicateField({ editor, state, label, autoFocus = false }: PredicateFieldProps): React.JSX.Element {
	const fieldRef = useRef<VscodeTextfield>(null);
	const [focused, setFocused] = useState(false);
	const terms = useTermOptions('predicate', state.predicateText, focused);
	const options = useMemo(() => terms.map(_optionOf), [terms]);

	// The field takes the focus once it has rendered the input it hands the focus to.
	useEffect(() => {
		const field = fieldRef.current;

		if (autoFocus && field) {
			void field.updateComplete.then(() => field.focus());
		}
	}, [autoFocus]);

	const handleBlur = (): void => {
		setFocused(false);

		if (state.predicateText.trim() !== '') {
			editor.commitPredicate();
		}
	};

	return (
		<Combobox
			text={focused || (editor.isNew && state.stored.predicate === undefined) ? state.predicateText : label}
			onTextChange={text => editor.inputPredicate(text)}
			options={options}
			ranked
			openOnFocus={editor.isNew}
			onPick={option => editor.pickPredicate(option)}
			onCreate={() => editor.commitPredicate()}
			onFocus={() => setFocused(true)}
			onBlur={handleBlur}
			label="Predicate"
			placeholder="predicate"
			title={state.predicateText}
			className="is-predicate"
			fieldRef={fieldRef}
		/>
	);
}

/**
 * The option of a predicate: its glyph, its label, its IRI, and the prefix picking it declares.
 * The prefixed name is matched against but not shown, as the IRI says the same.
 * @param term The predicate.
 * @returns The option.
 */
function _optionOf(term: ResourceOptionData): ComboboxOption<ResourceOptionData> {
	return {
		label: term.label,
		detail: term.subject.value,
		keywords: term.prefixedName,
		iconName: term.iconName,
		hint: term.missingPrefix ? `adds ${term.missingPrefix.prefix}:` : undefined,
		value: term
	};
}
