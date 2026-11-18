import { Literal } from '@rdfjs/types';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { TermData } from '../form-editor-model';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { getDatatypeFormat, getDatatypeProblem, getLiteralTagData, PrefixedNameOf } from './datatype-labels';
import { EditedRow } from './edited-row';
import { LiteralField } from './literal-field';
import { TagChoice } from './tag-picker-items';
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
 * field of a new value, as Escape does without writing; Backspace in an empty value removes it.
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
	const tag = getLiteralTagData(term, prefixedNameOf);

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={tag}
			current={term.language ? { language: term.language } : { datatype: datatype }}
			placeholder={_placeholderOf(term)}
			problem={term.value !== '' && editor.unfittingLiterals.has(index) ? getDatatypeProblem(tag?.text ?? 'string', datatype) : undefined}
			numeric={LiteralDatatypes.isNumeric(datatype)}
			integer={datatype === XSD.integer}
			languages={services.languages}
			onInput={text => _input(edited, index, term.language, text, languageFilter)}
			onFinish={() => {
				editor.confirm();
				edited.focusNewValue();
			}}
			onLeave={edited.focusNewValue}
			onRemove={() => _remove(edited, index)}
			onTagPick={choice => _pickTag(edited, index, choice)}
		/>
	);
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
 * Give a literal the tag picked for it. The empty field of the language a row lacks is no value
 * yet, and takes no other tag.
 * @param edited The row.
 * @param index The index of the value.
 * @param choice What the item picked gives the literal.
 */
function _pickTag(edited: EditedRow, index: number, choice: TagChoice): void {
	if (index < edited.editor.state.draft.values.length) {
		edited.editor.pickLiteralTag(index, choice.tag, choice.missingPrefix);
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
