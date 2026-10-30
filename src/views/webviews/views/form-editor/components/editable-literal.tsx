import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { getDatatypeHint, getDatatypeLabel } from './datatype-labels';
import { EditedRow } from './edited-row';
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
	 * The row the value belongs to.
	 */
	edited: EditedRow;
}

/**
 * A literal value of an edited statement as its field.
 * @param props The value and its row.
 * @returns The field, or nothing for a value that is no literal.
 */
export function EditableLiteral({ view, index, edited }: EditableLiteralProps): React.JSX.Element | null {
	const { editor, services } = edited;
	const term = view.term;

	if (term.kind !== 'literal') {
		return null;
	}

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={term.language ?? _datatypeLabel(term.datatype, services)}
			problem={editor.unfittingLiterals.has(index) && term.datatype ? getDatatypeHint(term.datatype) : undefined}
			numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
			integer={term.datatype === XSD.integer}
			languages={services.languages}
			services={services}
			onInput={text => editor.inputLiteral(index, text)}
			onTagPick={tag => editor.inputLiteralTag(index, tag)}
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
	return getDatatypeLabel(datatype ?? XSD.string) ?? services.resolver.viewOf({ kind: 'iri', iri: datatype ?? XSD.string }).prefixedName ?? datatype ?? '';
}
