import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermView } from '../form-editor-model';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { getDatatypeHint, getLiteralFieldTag } from './datatype-labels';
import { EditedRow } from './edited-row';
import { LiteralField } from './literal-field';
import { useFormEditorContext } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';

/**
 * Properties of the {@link LiteralValueField} component.
 */
export interface LiteralValueFieldProps {
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
export function LiteralValueField({ view, index, edited }: LiteralValueFieldProps): React.JSX.Element | null {
	const { editor, services } = edited;
	const { languageTags, languageFilter = LanguageFilter.ALL } = useFormEditorContext();
	const term = view.term;

	if (term.termType !== 'Literal') {
		return null;
	}

	const datatype = term.datatype.value;

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={getLiteralFieldTag(term, languageTags, datatype => services.resolver.viewOf(datatype).prefixedName)}
			problem={editor.unfittingLiterals.has(index) ? getDatatypeHint(datatype) : undefined}
			numeric={LiteralDatatypes.isNumeric(datatype)}
			integer={datatype === XSD.integer}
			languages={services.languages}
			services={services}
			onInput={text => _input(edited, index, term.language, text, languageFilter)}
			onTagPick={tag => editor.inputLiteralTag(index, tag)}
		/>
	);
}

/**
 * Take the text typed into a literal field. The empty field of the language a row lacks stands
 * after its values: its first text adds a literal of the language, and emptying that literal
 * removes it again, which gives the empty field back.
 * @param edited The row.
 * @param index The index of the value.
 * @param language The language tag of the literal.
 * @param text The text.
 * @param languageFilter The language shown.
 */
function _input(edited: EditedRow, index: number, language: string, text: string, languageFilter: LanguageFilter): void {
	const values = edited.editor.state.draft.values;

	if (index === values.length) {
		edited.editor.inputMissingLiteral(language, text);
	} else if (text === '' && languageFilter.filledIndex(values) === index) {
		edited.editor.removeValue(index);
	} else {
		edited.editor.inputLiteral(index, text);
	}
}
