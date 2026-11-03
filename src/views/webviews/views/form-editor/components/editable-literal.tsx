import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { getDatatypeHint, getDatatypeLabel } from './datatype-labels';
import { EditedRow } from './edited-row';
import { LiteralField } from './literal-field';
import { useFormEditorContext } from '../state/form-editor-context';
import { getLanguageTagLabel } from './term-labels';
import { LiteralSlot } from '../state/literal-slot';

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

	/**
	 * The part the literal plays for the language shown: the empty field of a language the row
	 * lacks, whose first text adds a literal of the language, or that literal, which emptying
	 * removes again.
	 */
	slot?: LiteralSlot;
}

/**
 * A literal value of an edited statement as its field.
 * @param props The value, its row and the part it plays for the language shown.
 * @returns The field, or nothing for a value that is no literal.
 */
export function EditableLiteral({ view, index, edited, slot }: EditableLiteralProps): React.JSX.Element | null {
	const { editor, services } = edited;
	const { languageTags } = useFormEditorContext();
	const term = view.term;

	if (term.termType !== 'Literal') {
		return null;
	}

	const datatype = term.datatype.value;

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={getLanguageTagLabel(term, languageTags) ?? _datatypeLabel(datatype, services)}
			problem={editor.unfittingLiterals.has(index) ? getDatatypeHint(datatype) : undefined}
			numeric={LiteralDatatypes.isNumeric(datatype)}
			integer={datatype === XSD.integer}
			languages={services.languages}
			services={services}
			onInput={text => _input(edited, index, term.language, text, slot)}
			onTagPick={tag => editor.inputLiteralTag(index, tag)}
		/>
	);
}

/**
 * Take the text typed into a literal field: the first text of the empty field of a language adds
 * a literal of it, and emptying that literal removes it, which gives the empty field back.
 * @param edited The row.
 * @param index The index of the value.
 * @param language The language tag of the literal.
 * @param text The text.
 * @param slot The part the literal plays for the language shown, if any.
 */
function _input(edited: EditedRow, index: number, language: string, text: string, slot: LiteralSlot | undefined): void {
	if (slot === 'empty') {
		edited.editor.inputMissingLiteral(language, text);
	} else if (slot === 'filled' && text === '') {
		edited.editor.removeValue(index);
	} else {
		edited.editor.inputLiteral(index, text);
	}
}

/**
 * The label of a datatype: the name the fields know it by, else its prefixed name; Text for plain
 * text.
 * @param datatype The IRI of the datatype.
 * @param services Gives the datatype its prefixed name.
 * @returns The label.
 */
function _datatypeLabel(datatype: string, services: StatementServices): string {
	return getDatatypeLabel(datatype) ?? services.resolver.viewOf(RdfDataFactory.namedNode(datatype)).prefixedName ?? datatype;
}
