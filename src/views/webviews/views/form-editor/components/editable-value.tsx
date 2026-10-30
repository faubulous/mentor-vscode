import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowHandle } from '../hooks/use-statement-row';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { XSD_STRING } from '../services/statement/well-known-iris';
import { RowValue } from '../state/row-value';
import { getDatatypeHint, getDatatypeLabel } from './datatype-labels';
import { LiteralField } from './literal-field';
import { StatementRowContext } from './statement-row-context';
import { TermValue } from './term-value';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link EditableValue} component.
 */
export interface EditableValueProps {
	/**
	 * The value.
	 */
	value: RowValue;

	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row.
	 */
	row: StatementRowHandle;

	/**
	 * Gives typed terms their labels.
	 */
	services: StatementServices;

	/**
	 * Where the row stands.
	 */
	context: StatementRowContext;
}

/**
 * One value of an edited statement: a literal as its field, a resource as a pill with a button that
 * removes it, and a blank node or a list as it is read, with that button beside it.
 * @param props The value and its row.
 * @returns The value.
 */
export function EditableValue({ value, index, row, services, context }: EditableValueProps): React.JSX.Element {
	const view = value.kind === 'written' ? value.view : services.resolver.viewOf(value.term);
	const remove = (): void => row.onRemoveValue(index);

	if (view.term.kind === 'literal' && !view.collection) {
		const term = view.term;

		return (
			<LiteralField
				index={index}
				text={term.value}
				tag={term.language ?? _datatypeLabel(term.datatype, services)}
				problem={row.unfittingLiterals.has(index) && term.datatype ? getDatatypeHint(term.datatype) : undefined}
				numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
				onInput={text => row.onLiteralInput(index, text)}
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
	if (!datatype || datatype === XSD_STRING) {
		return undefined;
	}

	return getDatatypeLabel(datatype) ?? services.resolver.viewOf({ kind: 'iri', iri: datatype }).prefixedName ?? datatype;
}
