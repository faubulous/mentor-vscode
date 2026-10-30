import { FormEvent, KeyboardEvent } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';

/**
 * Properties of the {@link NewValueField} component.
 */
export interface NewValueFieldProps {
	/**
	 * Edits the row.
	 */
	editor: StatementRowEditor;

	/**
	 * The state of the row.
	 */
	state: StatementRowState;
}

/**
 * The field a new value is typed into: Enter adds the value it reads as, and Backspace in the
 * empty field removes the last value.
 * @param props The row.
 * @returns The field.
 */
export function NewValueField({ editor, state }: NewValueFieldProps): React.JSX.Element {
	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			editor.commitPending();
		} else if (event.key === 'Backspace' && state.pendingText === '' && state.draft.values.length > 0) {
			event.preventDefault();
			editor.removeValue(state.draft.values.length - 1);
		}
	};

	return (
		<vscode-textfield
			className="input-field is-new"
			value={state.pendingText}
			placeholder={state.draft.values.length === 0 ? 'value' : 'add a value'}
			aria-label="New value"
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => editor.inputPending(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
		/>
	);
}
