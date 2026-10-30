import { FormEvent, KeyboardEvent } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { StatementRowHandle } from '../hooks/use-statement-row';

/**
 * Properties of the {@link NewValueField} component.
 */
export interface NewValueFieldProps {
	/**
	 * The row.
	 */
	row: StatementRowHandle;

	/**
	 * Whether the statement has no values yet.
	 */
	empty: boolean;
}

/**
 * The field a new value is typed into: Enter adds the value it reads as, and Backspace in the
 * empty field removes the last value.
 * @param props The row.
 * @returns The field.
 */
export function NewValueField({ row, empty }: NewValueFieldProps): React.JSX.Element {
	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			row.onPendingCommit();
		} else if (event.key === 'Backspace' && row.state.pendingText === '' && row.state.draft.values.length > 0) {
			event.preventDefault();
			row.onRemoveValue(row.state.draft.values.length - 1);
		}
	};

	return (
		<vscode-textfield
			className="input-field is-new"
			value={row.state.pendingText}
			placeholder={empty ? 'value' : 'add a value'}
			aria-label="New value"
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => row.onPendingInput(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
		/>
	);
}
