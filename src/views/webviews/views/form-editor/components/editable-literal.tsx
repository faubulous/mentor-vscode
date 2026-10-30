import { TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowHandle } from '../hooks/use-statement-row';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { XSD_INTEGER, XSD_STRING } from '../services/statement/well-known-iris';
import { LiteralField } from './literal-field';

/**
 * Properties of the {@link EditableLiteral} component.
 */
export interface EditableLiteralProps {
	/**
	 * The view of the value.
	 */
	view: TermView;

	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row.
	 */
	row: StatementRowHandle;

	/**
	 * Gives the datatypes their labels and the card its languages.
	 */
	services: StatementServices;
}

/**
 * A literal value of an edited statement as its field.
 * @param props The value and its row.
 * @returns The field, or nothing for a value that is no literal.
 */
export function EditableLiteral({ view, index, row, services }: EditableLiteralProps): React.JSX.Element | null {
	const term = view.term;

	if (term.kind !== 'literal') {
		return null;
	}

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={term.language ?? _datatypeLabel(term.datatype, services)}
			problem={row.literalProblems.get(index)}
			numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
			integer={term.datatype === XSD_INTEGER}
			languages={services.languages}
			services={services}
			onInput={text => row.onLiteralInput(index, text)}
			onTagPick={tag => row.onLiteralTag(index, tag)}
		/>
	);
}

/**
 * The label of a datatype: the name the fields know it by, else its prefixed name; Text for plain
 * text.
 * @param datatype The IRI of the datatype.
 * @param services Gives the datatype its prefixed name.
 * @returns The label.
 */
function _datatypeLabel(datatype: string | undefined, services: StatementServices): string {
	if (!datatype || datatype === XSD_STRING) {
		return 'Text';
	}

	return LiteralDatatypes.of(datatype)?.label ?? services.resolver.viewOf({ kind: 'iri', iri: datatype }).prefixedName ?? datatype;
}
