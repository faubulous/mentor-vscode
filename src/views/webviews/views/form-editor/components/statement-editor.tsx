import { FocusEvent, FormEvent, MouseEvent } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { formatIri } from '@src/utilities/prefixed-name';
import { TermView } from '../form-editor-model';
import { StatementEditorHandle, StatementEditorOptions, useStatementEditor } from '../hooks/use-statement-editor';
import { InputFieldId } from '../state/input-field-id';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { StatementLexer } from '../services/statement/statement-lexer';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { IStatementTextService } from '../services/statement/statement-text-service.interface';
import { CellKey } from '../state/cell-key';
import { EditableValue } from '../state/editable-value';
import { LiteralInput } from './literal-input';
import { NestedResourceCard } from './nested-resource-card';
import { RowError } from './row-error';
import { TagOption } from './tag-picker';
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
	 * The blank-node values of the row, in order, shown as cards below the pills.
	 */
	nestedNodes?: readonly TermView[];

	/**
	 * The languages the literals of the card are tagged with, offered by the tag picker.
	 */
	languages?: readonly string[];

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
 * A value with its index among the values of the statement.
 */
interface IndexedValue {
	/**
	 * The value.
	 */
	value: EditableValue;

	/**
	 * Its index.
	 */
	index: number;
}

/**
 * A statement as a row of the card grid: the predicate as a field that reads as a label at rest,
 * then its values. Resources stand as pills in one box with the input for the next one after
 * them, and the cards of blank nodes below; literals are fields of their own, one per value, each
 * with the label of its language tag or datatype after the text. The row is written when the
 * focus leaves it, or with Enter in a literal.
 * @param props The statement and its wiring.
 * @returns The row.
 */
export function StatementEditor(props: StatementEditorProps): React.JSX.Element {
	const { cellKey, terms, nestedNodes, languages, dataService, visited, draft, error, onDismissError, service } = props;
	const editor = useStatementEditor(props);
	const { statement, focusedField } = editor.state;
	const predicateFocused = focusedField?.equals(InputFieldId.PREDICATE) === true;
	const predicateDisplay = predicateFocused || !statement.predicate ? statement.predicate : service.predicateLabelOf(statement.predicate, terms);
	const indexed = statement.values.map((value, index) => ({ value, index }));
	const literals = indexed.filter(({ value }) => value.kind === 'literal' || value.kind === 'shorthandLiteral');
	const resources = indexed.filter(({ value }) => value.kind === 'resource' || value.kind === 'source');
	const nested = indexed.filter(({ value }) => value.kind === 'nestedNode');
	const literalInput = statement.hasNewValueField && resources.length === 0 && nested.length === 0 && editor.range === 'literal';

	return (
		<div
			ref={editor.containerRef}
			className={`statement-line is-editable${draft ? ' is-draft' : ''}`}
			role="group"
			aria-label={draft ? 'New statement' : predicateDisplay}
			data-cell={cellKey.toString()}
			tabIndex={-1}
			onFocus={editor.onContainerFocus}
			onBlur={editor.onContainerBlur}
		>
			<span className="statement-gutter"></span>
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
			<span className="statement-values">
				{statement.hasNewValueField && !literalInput && (
					<ResourceValuesInput resources={resources} nested={nested} nestedNodes={nestedNodes} editor={editor} service={service} terms={terms} dataService={dataService} visited={visited} />
				)}
				{literalInput && <NewValueInput editor={editor} placeholder={TermDescriberGhost(editor.range)} literal />}
				{literals.map(({ value, index }) => (
					<span key={index} className="statement-value is-literal">
						<LiteralField value={value} index={index} editor={editor} service={service} languages={languages} />
					</span>
				))}
			</span>
			<span className="statement-actions"></span>
			{error && <RowError message={error} onDismiss={onDismissError} />}
		</div>
	);
}

/**
 * The hint in the empty field of a row by what its predicate takes.
 * @param range What the predicate takes.
 * @returns The hint.
 */
function TermDescriberGhost(range: 'literal' | 'resource' | 'any'): string {
	switch (range) {
		case 'literal':
			return 'text';
		case 'resource':
			return 'resource';
		default:
			return 'value';
	}
}

/**
 * Properties of the {@link ResourceValuesInput} component.
 */
interface ResourceValuesInputProps {
	/**
	 * The resource values, and the lists edited as source.
	 */
	resources: readonly IndexedValue[];

	/**
	 * The blank-node values.
	 */
	nested: readonly IndexedValue[];

	/**
	 * The views of the blank nodes, in order.
	 */
	nestedNodes?: readonly TermView[];

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

	/**
	 * Supplies the statements of the blank nodes.
	 */
	dataService: IResourceDataService;

	/**
	 * The resources that hold this row.
	 */
	visited: readonly string[];
}

/**
 * The resource values of a row in one box: the pills, the input the next value is typed into
 * after them, and the cards of the blank nodes below. The box is one Tab stop; the arrows walk
 * the pills from the input. While the row holds only blank nodes the input stays out of the way,
 * and a link brings it back.
 * @param props The values and their wiring.
 * @returns The box.
 */
function ResourceValuesInput({ resources, nested, nestedNodes, editor, service, terms, dataService, visited }: ResourceValuesInputProps): React.JSX.Element {
	const { statement, focusedField } = editor.state;
	const onlyNodes = resources.length === 0 && nested.length > 0;
	const inputShown = !onlyNodes || focusedField?.equals(InputFieldId.NEW_VALUE) === true;

	const focusInput = (event: FocusEvent<HTMLElement> | MouseEvent<HTMLElement>): void => {
		// The box itself, or its free space, stands for its input.
		if (event.target === event.currentTarget) {
			event.preventDefault();
			editor.focusNewValue();
		}
	};

	return (
		<div className="statement-value is-resources">
			<div className={`resource-values${inputShown ? '' : ' is-input-hidden'}`} role="group" aria-label="Resources" tabIndex={0} onFocus={focusInput} onMouseDown={focusInput}>
				{resources.map(({ value, index }) => <ResourceValue key={index} value={value} index={index} editor={editor} service={service} terms={terms} />)}
				{inputShown && <NewValueInput editor={editor} placeholder={statement.values.length === 0 ? TermDescriberGhost(editor.range) : ''} />}
			</div>
			{nested.map(({ index }, position) => {
				const view = nestedNodes?.[position];

				return (
					<span key={index} className="statement-value is-node">
						{view?.nested && <NestedResourceCard nested={view.nested} dataService={dataService} depth={1} visited={visited} />}
					</span>
				);
			})}
			{onlyNodes && !inputShown && (
				<button type="button" className="statement-link" onClick={() => editor.focusNewValue()}>Add value</button>
			)}
		</div>
	);
}

/**
 * Properties of the {@link ResourceValue} component.
 */
interface ResourceValueProps extends IndexedValue {
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
 * One resource value: a pill, or the source of a list in a field of its own.
 * @param props The value and its row.
 * @returns The pill or the field.
 */
function ResourceValue({ value, index, editor, service, terms }: ResourceValueProps): React.JSX.Element | null {
	const field = InputFieldId.value(index);

	if (value.kind === 'resource') {
		const display = service.pillDisplayOf(value.text, terms);

		return <ValuePill label={display.label} title={display.title} iconName={display.iconName} field={editor.bind(field)} onRemove={() => editor.removeValue(index)} />;
	}

	if (value.kind !== 'source') {
		return null;
	}

	return (
		<vscode-textfield
			{...editor.bind(field)}
			className="input-field is-source"
			value={value.text}
			aria-label={`Value ${index + 1}`}
			spellCheck={false}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => editor.setValue(index, { ...value, text: event.currentTarget.value })}
		/>
	);
}

/**
 * Properties of the {@link NewValueInput} component.
 */
interface NewValueInputProps {
	/**
	 * The row.
	 */
	editor: StatementEditorHandle;

	/**
	 * The hint shown while nothing is typed.
	 */
	placeholder: string;

	/**
	 * Whether the input stands for a literal, as the one field of an empty row of text does.
	 */
	literal?: boolean;
}

/**
 * The input a new value is typed into.
 * @param props The row and the hint.
 * @returns The input.
 */
function NewValueInput({ editor, placeholder, literal }: NewValueInputProps): React.JSX.Element {
	return (
		<vscode-textfield
			{...editor.bind(InputFieldId.NEW_VALUE)}
			className={`input-field is-new${literal ? ' is-literal' : ''}`}
			value={editor.state.pending}
			placeholder={placeholder}
			aria-label="New value"
			spellCheck={false}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => editor.setPending(event.currentTarget.value)}
		/>
	);
}

/**
 * Properties of the {@link LiteralField} component.
 */
interface LiteralFieldProps extends IndexedValue {
	/**
	 * The row.
	 */
	editor: StatementEditorHandle;

	/**
	 * Labels and validates the literal.
	 */
	service: IStatementTextService;

	/**
	 * The languages of the card, offered by the tag picker.
	 */
	languages?: readonly string[];
}

/**
 * One literal value as its field, with the tag picker wired to the row.
 * @param props The literal and its row.
 * @returns The field.
 */
function LiteralField({ value, index, editor, service, languages }: LiteralFieldProps): React.JSX.Element | null {
	if (value.kind !== 'literal' && value.kind !== 'shorthandLiteral') {
		return null;
	}

	const text = value.kind === 'literal' ? value.value : value.text;
	const suffix = value.kind === 'literal' ? value.suffix : `^^${StatementLexer.bareDatatypeOf(value.text) ?? ''}`;
	const datatype = service.datatypeIriOf(suffix);
	const picking = editor.state.pickingTag === index;

	return (
		<LiteralInput
			index={index}
			value={text}
			tagLabel={service.tagLabelOf(value)}
			suffix={suffix}
			problem={service.literalProblemOf(value)}
			numeric={datatype !== undefined && LiteralDatatypes.isNumeric(datatype)}
			integer={datatype !== undefined && datatype.endsWith('#integer')}
			textField={editor.bind(InputFieldId.value(index))}
			tagField={editor.bind(InputFieldId.tag(index))}
			pickerOptions={picking ? _tagOptions(text, languages ?? [], service) : undefined}
			onValueChange={typed => editor.setValue(index, value.kind === 'literal' ? { ...value, value: typed } : { kind: 'literal', value: typed, suffix })}
			onOpenPicker={() => editor.openTagPicker(index)}
			onPick={picked => editor.pickTag(index, _normalizedSuffix(picked, service))}
			onCancelPicker={editor.closeTagPicker}
		/>
	);
}

/**
 * The tags the picker offers for a text: the datatypes the text fits, then the languages of the
 * card.
 * @param text The text of the literal.
 * @param languages The languages of the card.
 * @param service Writes the datatypes as the document does.
 * @returns The tags.
 */
function _tagOptions(text: string, languages: readonly string[], service: IStatementTextService): TagOption[] {
	const namespaces = service.vocabulary.namespaces;
	const datatypes = LiteralDatatypes.fitting(text).map(datatype => {
		const written = formatIri(namespaces, datatype.iri);

		return { label: datatype.label, suffix: datatype.iri.endsWith('#string') ? '' : `^^${written}`, description: `${written}\n${datatype.iri}` };
	});

	return [...datatypes, ...languages.map(language => ({ label: language, suffix: `@${language}`, description: 'Language' }))];
}

/**
 * The tag as it is stored: `xsd:string` is implied, and a bare number keeps its shorthand.
 * @param suffix The tag picked.
 * @param service Resolves datatypes.
 * @returns The tag.
 */
function _normalizedSuffix(suffix: string, service: IStatementTextService): string {
	const iri = service.datatypeIriOf(suffix);

	return iri !== undefined && iri.endsWith('#string') ? '' : suffix;
}
