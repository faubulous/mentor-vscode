import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { getDatatypeHint, getDatatypeLabel } from './datatype-labels';
import { EditedRow } from './edited-row';
import { LiteralField } from './literal-field';
import { StatementRowContext } from './statement-row-context';
import { TermValue } from './term-value';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link EditableValue} component.
 */
export interface EditableValueProps extends StatementRowContext {
	/**
	 * The view of the value.
	 */
	view: TermView;

	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row the value belongs to.
	 */
	edited: EditedRow;
}

/**
 * One value of an edited statement: a literal as its field, a resource as a pill with a button that
 * removes it, and a blank node or a list as it is read, with that button beside it.
 * @param props The value and its row.
 * @returns The value.
 */
export function EditableValue({ view, index, edited, ...context }: EditableValueProps): React.JSX.Element {
	const { editor, services } = edited;
	const remove = (): void => editor.removeValue(index);

	if (view.term.kind === 'literal' && !view.collection) {
		const term = view.term;

		return (
			<LiteralField
				index={index}
				text={term.value}
				tag={term.language ?? _datatypeLabel(term.datatype, services)}
				problem={editor.unfittingLiterals.has(index) && term.datatype ? getDatatypeHint(term.datatype) : undefined}
				numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
				onInput={text => editor.inputLiteral(index, text)}
			/>
		);
	}

	if (view.term.kind === 'iri') {
		return <span data-value-index={index}><ValuePill view={view} onRemove={remove} /></span>;
	}

	return (
		<span className="statement-value-whole" data-value-index={index}>
			<TermValue view={view} {...context} />
			<button type="button" className="statement-value-remove" aria-label={`Remove value ${index + 1}`} title="Remove" onClick={remove}>
				<vscode-icon name="close" size={12}></vscode-icon>
			</button>
		</span>
	);
}

/**
 * The label of a datatype: the name the fields know it by, else its prefixed name.
 * @param datatype The IRI of the datatype.
 * @param services Gives the datatype its prefixed name.
 * @returns The label, or `undefined` for plain text.
 */
function _datatypeLabel(datatype: string | undefined, services: StatementServices): string | undefined {
	if (!datatype || datatype === XSD.string) {
		return undefined;
	}

	return getDatatypeLabel(datatype) ?? services.resolver.viewOf({ kind: 'iri', iri: datatype }).prefixedName ?? datatype;
}
