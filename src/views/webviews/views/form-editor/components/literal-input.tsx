import { FormEvent } from 'react';
import { VscodeTextarea, VscodeTextfield } from '@vscode-elements/elements';
import { InputFieldBinding } from '../hooks/use-statement-editor';

/**
 * How many lines a literal field grows to before it scrolls.
 */
const MAX_ROWS = 12;

/**
 * Properties of the {@link LiteralInput} component.
 */
export interface LiteralInputProps {
	/**
	 * The index of the value among the values of the statement, which names the field.
	 */
	index: number;

	/**
	 * The text of the literal, without escapes.
	 */
	value: string;

	/**
	 * The language tag or datatype, such as `@en` or `^^xsd:date`, or empty.
	 */
	suffix: string;

	/**
	 * Wires the text area to the row.
	 */
	textField: InputFieldBinding;

	/**
	 * Wires the field of the tag to the row, while the literal has one.
	 */
	tagField?: InputFieldBinding;

	/**
	 * Called with the text as it is typed.
	 */
	onValueChange: (value: string) => void;

	/**
	 * Called with the suffix as its tag is typed.
	 */
	onSuffixChange: (suffix: string) => void;
}

/**
 * A literal being edited: a text area that grows with its lines, and after it, while the literal
 * has one, the small field of its language tag or datatype, which `@` or `^^` at the end of the
 * text opens.
 * @param props The literal and its wiring.
 * @returns The fields.
 */
export function LiteralInput({ index, value, suffix, textField, tagField, onValueChange, onSuffixChange }: LiteralInputProps): React.JSX.Element {
	const datatype = suffix.startsWith('^^');

	return (
		<span className="literal-input">
			<vscode-textarea
				{...textField}
				className="input-field is-literal"
				rows={Math.min(value.split('\n').length, MAX_ROWS)}
				resize="vertical"
				value={value}
				aria-label={`Value ${index + 1}`}
				spellCheck={false}
				onInput={(event: FormEvent<VscodeTextarea>) => onValueChange(event.currentTarget.value)}
			/>
			{tagField && (
				<vscode-textfield
					{...tagField}
					className="input-field is-tag"
					value={_tagTextOf(suffix)}
					placeholder={datatype ? 'datatype' : 'lang'}
					aria-label={`${datatype ? 'Datatype' : 'Language'} of value ${index + 1}`}
					spellCheck={false}
					autocomplete="off"
					onInput={(event: FormEvent<VscodeTextfield>) => onSuffixChange(_suffixOfTag(suffix, event.currentTarget.value))}
				/>
			)}
		</span>
	);
}

/**
 * The tag of a literal as its field shows it: the language or the datatype, without the `@` or
 * `^^` that writes it.
 * @param suffix The suffix, such as `@en` or `^^xsd:date`.
 * @returns The tag.
 */
function _tagTextOf(suffix: string): string {
	return suffix.replace(/^(@|\^\^)/, '');
}

/**
 * The suffix a tag is written as: after `@` for a language, after `^^` for a datatype.
 * @param suffix The suffix the literal has, which tells which of the two it is.
 * @param text The tag as typed.
 * @returns The suffix.
 */
function _suffixOfTag(suffix: string, text: string): string {
	return `${suffix.startsWith('^^') ? '^^' : '@'}${text.replace(/^(@|\^\^)/, '')}`;
}
