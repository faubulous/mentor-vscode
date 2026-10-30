import { FormEvent } from 'react';
import { VscodeTextarea, VscodeTextfield } from '@vscode-elements/elements';

/**
 * How many lines a literal of several lines grows to before it scrolls.
 */
const MAX_ROWS = 12;

/**
 * Properties of the {@link LiteralField} component.
 */
export interface LiteralFieldProps {
	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The text of the literal.
	 */
	text: string;

	/**
	 * The language tag or the label of the datatype, shown after the text; none for plain text.
	 */
	tag?: string;

	/**
	 * Why the text does not fit the datatype, shown in place of the tag.
	 */
	problem?: string;

	/**
	 * Whether the value is a number, written in the editor font.
	 */
	numeric: boolean;

	/**
	 * Called with the text as it is typed.
	 */
	onInput: (text: string) => void;
}

/**
 * A literal value being edited: a text field, or a text area for a text of several lines, with
 * its language tag or datatype after the text, and in its place why the text does not fit the
 * datatype.
 * @param props The literal and its callback.
 * @returns The field.
 */
export function LiteralField({ index, text, tag, problem, numeric, onInput }: LiteralFieldProps): React.JSX.Element {
	const label = `Value ${index + 1}`;
	const suffix = problem ?? tag;
	const tagElement = suffix ? <span slot="content-after" className={`literal-field-tag${problem ? ' is-problem' : ''}`}>{suffix}</span> : null;

	if (text.includes('\n')) {
		return (
			<span className="literal-field is-multiline" data-value-index={index}>
				<vscode-textarea
					className="input-field"
					rows={Math.min(text.split('\n').length, MAX_ROWS)}
					resize="vertical"
					value={text}
					aria-label={label}
					onInput={(event: FormEvent<VscodeTextarea>) => onInput(event.currentTarget.value)}
				/>
				{suffix && <span className={`literal-field-tag${problem ? ' is-problem' : ''}`}>{suffix}</span>}
			</span>
		);
	}

	return (
		<vscode-textfield
			className={`input-field literal-field${numeric ? ' is-numeric' : ''}`}
			data-value-index={index}
			value={text}
			invalid={problem !== undefined}
			aria-label={label}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => onInput(event.currentTarget.value)}
		>
			{tagElement}
		</vscode-textfield>
	);
}
