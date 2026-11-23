import { useEffect, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { TermPicker } from './term-picker';

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

	/**
	 * Called once a row for a new statement takes the predicate picked or typed with Enter, so the
	 * value can be typed next.
	 */
	onPredicateTaken?: () => void;
}

/**
 * The predicate of an edited row: its label at rest, and how it is written while the field has
 * the focus. A row for a new statement shows what is typed at rest until the text names a
 * predicate, and its label once it does; picking a predicate, or Enter on one typed, takes it. While the field has the focus it offers
 * the predicates of the document and the workspace that match the typed text, those of a new
 * statement as soon as it takes the focus. The predicate picked or typed is taken when the field
 * is left or Enter is pressed in it.
 * @param props The row, the label of its predicate, whether the field takes the focus and what
 * follows once a new statement takes its predicate.
 * @returns The field.
 */
export function PredicateField({ editor, state, label, autoFocus = false, onPredicateTaken }: PredicateFieldProps): React.JSX.Element {
	const fieldRef = useRef<VscodeTextfield>(null);
	const [focused, setFocused] = useState(false);

	// The field takes the focus once it has rendered the input it hands the focus to.
	useEffect(() => {
		const field = fieldRef.current;

		if (autoFocus && field) {
			void field.updateComplete.then(() => field.focus());
		}
	}, [autoFocus]);

	// A row for a new statement goes on to its value once it has a predicate.
	const take = (commit: () => void): void => {
		commit();

		if (editor.isNew && editor.state.draft.predicate !== undefined && !editor.state.problem) {
			onPredicateTaken?.();
		}
	};

	const handleBlur = (): void => {
		setFocused(false);

		if (state.predicateText.trim() !== '') {
			editor.commitPredicate();
		}
	};

	return (
		<TermPicker
			targetType="predicate"
			statement={{ subject: editor.subject }}
			text={focused || (editor.isNew && state.draft.predicate === undefined) ? state.predicateText : label}
			onTextChange={text => editor.inputPredicate(text)}
			openOnFocus={editor.isNew}
			onPick={option => take(() => editor.pickPredicate(option))}
			onCreate={() => take(() => editor.commitPredicate())}
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
