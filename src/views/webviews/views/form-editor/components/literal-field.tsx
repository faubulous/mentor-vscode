import { FormEvent, KeyboardEvent, MouseEvent, useRef, useState } from 'react';
import { VscodeTextarea, VscodeTextfield } from '@vscode-elements/elements';
import { StatementServices } from '../hooks/use-statement-services';
import { LiteralTag } from '../state/literal-tag';
import { TagPicker } from './tag-picker';

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
	 * The language tag or the label of the datatype, shown after the text.
	 */
	tag: string;

	/**
	 * Why the text does not fit the datatype, shown in place of the tag.
	 */
	problem?: string;

	/**
	 * Whether the value is a number, written in the editor font.
	 */
	numeric: boolean;

	/**
	 * Whether the value is a whole number, which ↑ and ↓ step by one.
	 */
	integer: boolean;

	/**
	 * The languages of the card, which the tag picker offers.
	 */
	languages: readonly string[];

	/**
	 * Reads a typed datatype and names the datatypes on offer.
	 */
	services: StatementServices;

	/**
	 * Called with the text as it is typed.
	 */
	onInput: (text: string) => void;

	/**
	 * Called with the tag picked for the literal.
	 */
	onTagPick: (tag: LiteralTag) => void;
}

/**
 * A literal being edited: a text field, or a text area for a text of several lines, with the muted
 * label of its language tag or datatype after the text; while the text does not fit the datatype,
 * the reason stands in its place. The label is a button that opens the tag picker over the end of
 * the field.
 * @param props The literal and its callbacks.
 * @returns The field.
 */
export function LiteralField(props: LiteralFieldProps): React.JSX.Element {
	const { index, text, tag, problem, numeric, integer, languages, services, onInput, onTagPick } = props;
	const [picking, setPicking] = useState(false);
	const textfieldRef = useRef<VscodeTextfield>(null);
	const textareaRef = useRef<VscodeTextarea>(null);
	const label = `Value ${index + 1}`;
	const multiline = text.includes('\n');

	// A whole number steps with the arrows, as a number field does; the field stays a text field,
	// whose value the browser does not empty while a number is half typed.
	const stepInteger = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (!integer || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || !/^[+-]?\d+$/.test(text)) {
			return;
		}

		event.preventDefault();
		onInput((BigInt(text) + (event.key === 'ArrowUp' ? 1n : -1n)).toString());
	};

	const openPicker = (event: MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
		setPicking(true);
	};

	const tagButton = (
		<button
			type="button"
			slot={multiline ? undefined : 'content-after'}
			className={`literal-field-tag${problem ? ' is-problem' : ''}`}
			title={problem ? `${problem}. Change the language or datatype` : 'Change the language or datatype'}
			aria-label={`${problem ?? tag}. Change the language or datatype of value ${index + 1}`}
			onClick={openPicker}
		>
			{problem ?? tag}
		</button>
	);

	// The picker goes with the focus in it, so the focus comes back to the field of the literal.
	const closePicker = (): void => {
		setPicking(false);
		(textfieldRef.current ?? textareaRef.current)?.focus();
	};

	const picker = picking && (
		<TagPicker
			text={text}
			languages={languages}
			services={services}
			onPick={picked => {
				closePicker();
				onTagPick(picked);
			}}
			onCancel={closePicker}
		/>
	);

	return (
		<span className={`literal-field${multiline ? ' is-multiline' : ''}`} data-value-index={index}>
			{multiline
				? (
					<>
						<vscode-textarea ref={textareaRef} className="input-field" rows={Math.min(text.split('\n').length, MAX_ROWS)} resize="vertical" value={text} aria-label={label} onInput={(event: FormEvent<VscodeTextarea>) => onInput(event.currentTarget.value)} />
						{tagButton}
					</>
				)
				: (
					<vscode-textfield
						ref={textfieldRef}
						className={`input-field is-literal${numeric ? ' is-numeric' : ''}`}
						value={text}
						invalid={problem !== undefined}
						aria-label={label}
						autocomplete="off"
						onInput={(event: FormEvent<VscodeTextfield>) => onInput(event.currentTarget.value)}
						onKeyDown={stepInteger}
					>
						{tagButton}
					</vscode-textfield>
				)}
			{picker}
		</span>
	);
}
