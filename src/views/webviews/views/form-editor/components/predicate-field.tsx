import { FormEvent, KeyboardEvent, useState } from 'react';
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
}

/**
 * The predicate of an edited row: its label at rest, and how it is written while the field has
 * the focus. The predicate it names is taken when the field is left or Enter is pressed in it.
 * @param props The row and the label of its predicate.
 * @returns The field.
 */
export function PredicateField({ editor, state, label }: PredicateFieldProps): React.JSX.Element {
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

	return (
		<vscode-textfield
			className="input-field is-predicate"
			value={focused || editor.isNew ? state.predicateText : label}
			placeholder="predicate"
			title={state.predicateText}
			aria-label="Predicate"
			autocomplete="off"
			onFocus={() => setFocused(true)}
			onBlur={handleBlur}
			onInput={(event: FormEvent<VscodeTextfield>) => editor.inputPredicate(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
		/>
	);
}
