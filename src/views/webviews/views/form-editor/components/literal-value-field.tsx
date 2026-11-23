import { Literal } from '@rdfjs/types';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermData } from '../form-editor-model';
import { LiteralDatatypes } from '@src/utilities/literal-datatypes';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getDatatypeFormat, getDatatypeProblem, getLiteralAnnotationData, getSuggestedAnnotationData, PrefixedNameOf } from './datatype-labels';
import { EditedRow } from './edited-row';
import { LiteralField } from './literal-field';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';
import { useFormEditorContext } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';

/**
 * What an empty value shows where its datatype has no format: that it takes text.
 */
const TEXT_PLACEHOLDER = 'Text';

/**
 * Properties of the {@link LiteralValueField} component.
 */
export interface LiteralValueFieldProps {
	/**
	 * The view of the value.
	 */
	view: TermData;

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
 * A literal value of an edited statement as its field. Enter writes the row and goes on to the
 * field of a new value, as Escape does without writing; Backspace in an empty value removes it. A
 * plain string offers the datatype its text looks like a value of.
 * @param props The value and its row.
 * @returns The field, or nothing for a value that is no literal.
 */
export function LiteralValueField({ view, index, edited }: LiteralValueFieldProps): React.JSX.Element | null {
	const { editor, services } = edited;
	const { languageFilter = LanguageFilter.ALL } = useFormEditorContext();
	const term = view.term;

	if (term.termType !== 'Literal') {
		return null;
	}

	const datatype = term.datatype.value;
	const prefixedNameOf: PrefixedNameOf = datatypeTerm => services.resolver.viewOf(datatypeTerm).prefixedName;
	const annotation = getLiteralAnnotationData(term, prefixedNameOf);
	// A range that names the datatype of the values is not overridden by a suggestion.
	const suggested = _suggestionOf(term, index < editor.state.draft.values.length && edited.defaultType.datatype === undefined);

	return (
		<LiteralField
			index={index}
			text={term.value}
			annotation={annotation}
			current={term.language ? { language: term.language } : { datatype: datatype }}
			placeholder={_placeholderOf(term)}
			problem={term.value !== '' && editor.unfittingLiterals.has(index) ? getDatatypeProblem(annotation?.text ?? 'string', datatype) : undefined}
			suggestion={suggested ? getSuggestedAnnotationData(RdfDataFactory.namedNode(suggested), prefixedNameOf) : undefined}
			numeric={LiteralDatatypes.isNumeric(datatype)}
			integer={datatype === XSD.integer}
			languages={services.languages}
			offersResource={index < editor.state.draft.values.length}
			onInput={text => _input(edited, index, term.language, text, languageFilter)}
			onFinish={() => {
				editor.confirm();
				edited.focusNewValue();
			}}
			onLeave={edited.focusNewValue}
			onRemove={() => _remove(edited, index)}
			onAnnotationPick={selection => _pickAnnotation(edited, index, selection)}
			onAcceptSuggestion={() => suggested && editor.pickLiteralAnnotation(index, { datatype: suggested })}
		/>
	);
}

/**
 * The datatype a literal is offered: the one the text of a plain string looks like a value of. A
 * literal with a datatype or a language, the empty field of a language the row lacks, and a value
 * whose datatype a range names are offered none.
 * @param term The literal.
 * @param offered Whether the literal may be offered one: a value of the row, not the field of a
 * missing language, of a predicate whose range names no datatype.
 * @returns The IRI of the datatype, or `undefined`.
 */
function _suggestionOf(term: Literal, offered: boolean): string | undefined {
	return offered && term.language === '' && term.datatype.value === XSD.string ? LiteralDatatypes.suggest(term.value) : undefined;
}

/**
 * What an empty literal shows: the text a value of its datatype is written as, or that it takes
 * text.
 * @param term The literal.
 * @returns The placeholder.
 */
function _placeholderOf(term: Literal): string {
	return term.language ? TEXT_PLACEHOLDER : getDatatypeFormat(term.datatype.value) ?? TEXT_PLACEHOLDER;
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

/**
 * Give a literal the annotation picked for it, or make it the resource its text names and go on to the
 * field of a new value. The empty field of the language a row lacks is no value yet, and takes no
 * other annotation.
 * @param edited The row.
 * @param index The index of the value.
 * @param selection What the item picked gives the literal.
 */
function _pickAnnotation(edited: EditedRow, index: number, selection: LiteralAnnotationPickerSelection): void {
	if (index >= edited.editor.state.draft.values.length) {
		return;
	}

	if (selection.type === 'resource') {
		edited.editor.turnLiteralIntoResource(index);
		edited.focusNewValue();
	} else {
		edited.editor.pickLiteralAnnotation(index, selection.annotation, selection.missingPrefix);
	}
}

/**
 * Remove an empty literal and go on to the field of a new value; the empty field of the language a
 * row lacks is no value, and stays.
 * @param edited The row.
 * @param index The index of the value.
 */
function _remove(edited: EditedRow, index: number): void {
	edited.focusNewValue();

	if (index < edited.editor.state.draft.values.length) {
		edited.editor.removeValue(index);
	}
}
