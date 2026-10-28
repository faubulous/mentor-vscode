import { FormEvent, MouseEvent } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { TermView } from '../form-editor-model';
import { InputFieldBinding, StatementEditorHandle, StatementEditorOptions, useStatementEditor } from '../hooks/use-statement-editor';
import { InputFieldId } from '../input/input-field-id';
import { TermDescriber } from '../line/term-describer';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { IStatementTextService } from '../services/statement-text-service.interface';
import { CellKey } from '../state/cell-key';
import { EditableValue } from '../state/editable-value';
import { LiteralInput } from './literal-input';
import { NestedResourceCard } from './nested-resource-card';
import { RowError } from './row-error';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link StatementEditor} component.
 */
export interface StatementEditorProps extends StatementEditorOptions {
	/**
	 * The cell the row is focused and restored by.
	 */
	cellKey: CellKey;

	/**
	 * The views of the terms the row was built from, keyed by how they are written.
	 */
	terms?: Record<string, TermView>;

	/**
	 * The blank-node values of the row, in order, which stand in the rows of their values.
	 */
	nestedNodes?: readonly TermView[];

	/**
	 * Supplies the statements of the blank nodes.
	 */
	dataService: IResourceDataService;

	/**
	 * The resources that hold this row, which guard against cycles.
	 */
	visited: readonly string[];

	/**
	 * Whether the row is one opened for a new statement.
	 */
	draft?: boolean;

	/**
	 * Why the row was not written, shown under it.
	 */
	error?: string;

	/**
	 * Removes the error.
	 */
	onDismissError?: () => void;
}

/**
 * A statement as fields on the grid of its card: the predicate in the first column, and in the
 * second each value on a row of its own: a pill per resource, a growing text area per literal
 * with its language tag or datatype after it, the card of a blank node, and the field a new
 * value is typed into below them. The statement is written when the focus leaves the row.
 * @param props The statement and its wiring.
 * @returns The row.
 */
export function StatementEditor(props: StatementEditorProps): React.JSX.Element {
	const { cellKey, terms, nestedNodes, dataService, visited, draft, error, onDismissError, service } = props;
	const editor = useStatementEditor(props);
	const { statement, pending, focusedField } = editor.state;
	const predicateFocused = focusedField?.equals(InputFieldId.PREDICATE) === true;
	const predicateDisplay = predicateFocused || !statement.predicate ? statement.predicate : service.predicateLabelOf(statement.predicate, terms);
	const empty = statement.values.length === 0;
	let nestedIndex = 0;

	const focusNewValueOnFreeSpace = (event: MouseEvent<HTMLElement>): void => {
		// The free space after the values is where a new value is typed.
		if (event.target === event.currentTarget) {
			event.preventDefault();
			editor.focusNewValue();
		}
	};

	return (
		<div
			ref={editor.containerRef}
			className={`statement-line is-editable${draft ? ' is-draft' : ''}${empty ? ' is-empty' : ''}`}
			role="group"
			aria-label={draft ? 'New statement' : predicateDisplay}
			data-cell={cellKey.toString()}
			tabIndex={-1}
			onFocus={editor.onContainerFocus}
			onBlur={editor.onContainerBlur}
		>
			<span className="statement-predicate">
				<vscode-textfield
					{...editor.bind(InputFieldId.PREDICATE)}
					className="input-field is-predicate"
					value={predicateDisplay}
					placeholder="predicate"
					title={statement.predicate}
					aria-label="Predicate"
					spellCheck={false}
					autocomplete="off"
					onInput={(event: FormEvent<VscodeTextfield>) => editor.setPredicate(event.currentTarget.value)}
				/>
			</span>
			<span className="statement-values" onMouseDown={focusNewValueOnFreeSpace}>
				{statement.values.map((value, index) => {
					if (value.kind === 'nestedNode') {
						const view = nestedNodes?.[nestedIndex++];

						return (
							<span key={index} className="statement-value is-node">
								{view?.nested && <NestedResourceCard nested={view.nested} dataService={dataService} depth={1} visited={visited} />}
							</span>
						);
					}

					return (
						<span key={index} className="statement-value">
							<ValueInput value={value} index={index} editor={editor} service={service} terms={terms} />
						</span>
					);
				})}
				<span className="statement-value is-new">
					<vscode-textfield
						{...editor.bind(InputFieldId.NEW_VALUE)}
						className="input-field is-new"
						value={pending}
						placeholder={empty ? TermDescriber.ghostFor(editor.range) : ''}
						aria-label="New value"
						spellCheck={false}
						autocomplete="off"
						onInput={(event: FormEvent<VscodeTextfield>) => editor.setPending(event.currentTarget.value)}
					/>
				</span>
			</span>
			{error && <RowError message={error} onDismiss={onDismissError} />}
		</div>
	);
}

/**
 * Properties of the {@link ValueInput} component.
 */
interface ValueInputProps {
	/**
	 * The value.
	 */
	value: EditableValue;

	/**
	 * The index of the value among the values of the statement.
	 */
	index: number;

	/**
	 * The row.
	 */
	editor: StatementEditorHandle;

	/**
	 * Tells how a resource is shown.
	 */
	service: IStatementTextService;

	/**
	 * The views of the terms the row was built from.
	 */
	terms?: Record<string, TermView>;
}

/**
 * The field of one value, by its kind: a pill for a resource, which typing opens as text, a text
 * area for a literal, and a text field for a number, a boolean or a list edited as source.
 * @param props The value and its row.
 * @returns The field.
 */
function ValueInput({ value, index, editor, service, terms }: ValueInputProps): React.JSX.Element | null {
	const field = InputFieldId.value(index);
	const label = `Value ${index + 1}`;

	switch (value.kind) {
		case 'resource': {
			if (editor.state.editingPill === index) {
				return <TextInput binding={editor.bind(field)} value={value.text} label={label} onChange={text => editor.setValue(index, { kind: 'resource', text })} />;
			}

			const display = service.pillDisplayOf(value.text, terms);

			return <ValuePill label={display.label} title={display.title} iconName={display.iconName} field={editor.bind(field)} />;
		}
		case 'literal':
			return (
				<LiteralInput
					index={index}
					value={value.value}
					suffix={value.suffix}
					textField={editor.bind(field)}
					tagField={value.suffix ? editor.bind(InputFieldId.tag(index)) : undefined}
					onValueChange={text => editor.setValue(index, { ...value, value: text })}
					onSuffixChange={suffix => editor.setValue(index, { ...value, suffix })}
				/>
			);
		case 'shorthandLiteral':
		case 'source':
			return <TextInput binding={editor.bind(field)} value={value.text} label={label} className="is-source" onChange={text => editor.setValue(index, { ...value, text })} />;
		default:
			return null;
	}
}

/**
 * Properties of the {@link TextInput} component.
 */
interface TextInputProps {
	/**
	 * Wires the field to the row.
	 */
	binding: InputFieldBinding;

	/**
	 * The text.
	 */
	value: string;

	/**
	 * What the field is called for assistive technology.
	 */
	label: string;

	/**
	 * A class telling what the field holds.
	 */
	className?: string;

	/**
	 * Called with the text as it is typed.
	 */
	onChange: (value: string) => void;
}

/**
 * A single-line field of a value.
 * @param props The text and its wiring.
 * @returns The field.
 */
function TextInput({ binding, value, label, className, onChange }: TextInputProps): React.JSX.Element {
	return (
		<vscode-textfield
			{...binding}
			className={`input-field${className ? ` ${className}` : ''}`}
			value={value}
			aria-label={label}
			spellCheck={false}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => onChange(event.currentTarget.value)}
		/>
	);
}
