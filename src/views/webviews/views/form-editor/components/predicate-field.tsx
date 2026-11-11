import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';

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
 * given, as the label row of a card without a label has. The predicate it names is taken when the
 * field is left or Enter is pressed in it.
 * @param props The row, the label of its predicate and whether the field takes the focus.
 * @returns The field.
 */
export function PredicateField({ editor, state, label, autoFocus = false }: PredicateFieldProps): React.JSX.Element {
	const fieldRef = useRef<VscodeTextfield>(null);

	// The field takes the focus once it has rendered the input it hands the focus to.
	useEffect(() => {
		const field = fieldRef.current;

		if (autoFocus && field) {
			void field.updateComplete.then(() => field.focus());
		}
	}, [autoFocus]);

	const [focused, setFocused] = useState(false);

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			editor.commitPredicate();
		}
	};

	const handleBlur = (): void => {
		setFocused(false);

		if (state.predicateText.trim() !== '') {
			editor.commitPredicate();
		}
	};

	// The field takes no width of its own; the label beside it, which is not shown, sizes the label
	// column of the card to the longest label, as the text of a row that only reads does. What is
	// typed does not, so the columns stay where they are while a predicate is typed.
	return (
		<>
			<vscode-textfield
				ref={fieldRef}
				className="input-field is-predicate"
				value={focused || (editor.isNew && state.stored.predicate === undefined) ? state.predicateText : label}
				placeholder="predicate"
				title={state.predicateText}
				aria-label="Predicate"
				autocomplete="off"
				onFocus={() => setFocused(true)}
				onBlur={handleBlur}
				onInput={(event: FormEvent<VscodeTextfield>) => editor.inputPredicate(event.currentTarget.value)}
				onKeyDown={handleKeyDown}
			/>
			<span className="statement-predicate-sizer" aria-hidden="true">{editor.isNew ? '' : label}</span>
		</>
	);
}
