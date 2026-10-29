import { FormEvent } from 'react';
import { VscodeTextarea, VscodeTextfield } from '@vscode-elements/elements';
import { InputFieldBinding } from '../hooks/use-statement-editor';
import { TagOption, TagPicker } from './tag-picker';

/**
 * How many lines a literal text area grows to before it scrolls.
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
	 * The label of its language tag or datatype, shown after the text.
	 */
	tagLabel: string;

	/**
	 * The tag as written, which the picker starts on.
	 */
	suffix: string;

	/**
	 * What keeps the text from being a value of its datatype, shown in place of the tag.
	 */
	problem?: string;

	/**
	 * Whether the value is a number, written in the editor font.
	 */
	numeric: boolean;

	/**
	 * Whether the value is a whole number, which the arrows step.
	 */
	integer: boolean;

	/**
	 * Wires the text field to the row.
	 */
	textField: InputFieldBinding;

	/**
	 * Wires the button of the tag to the row.
	 */
	tagField: InputFieldBinding;

	/**
	 * The tags the picker offers, while it is open.
	 */
	pickerOptions?: readonly TagOption[];

	/**
	 * Called with the text as it is typed.
	 */
	onValueChange: (value: string) => void;

	/**
	 * Called when the button of the tag is pressed.
	 */
	onOpenPicker: () => void;

	/**
	 * Called with the tag picked.
	 */
	onPick: (suffix: string) => void;

	/**
	 * Called when the picker is left without a pick.
	 */
	onCancelPicker: () => void;
}

/**
 * A literal being edited: a text field with the muted label of its language tag or datatype after
 * the text, which opens the picker of the tag; while the text does not fit the datatype, the
 * label gives way to the reason. A text of several lines is a text area instead.
 * @param props The literal and its wiring.
 * @returns The field.
 */
export function LiteralInput(props: LiteralInputProps): React.JSX.Element {
	const { index, value, tagLabel, suffix, problem, numeric, integer, textField, tagField, pickerOptions, onValueChange, onOpenPicker, onPick, onCancelPicker } = props;
	const label = `Value ${index + 1}`;
	const tag = pickerOptions
		? <TagPicker options={pickerOptions} current={suffix} onPick={onPick} onCancel={onCancelPicker} />
		: (
			<button {...tagField} type="button" className={`literal-tag-button${problem ? ' is-problem' : ''}`} title={problem ?? 'Change the language or datatype'} aria-label={problem ? `${problem}. Change the language or datatype` : `${tagLabel}. Change the language or datatype`} onClick={onOpenPicker}>
				{problem ?? tagLabel}
			</button>
		);

	if (value.includes('\n')) {
		return (
			<span className="literal-input is-multiline">
				<vscode-textarea
					{...textField}
					className="input-field is-literal"
					rows={Math.min(value.split('\n').length, MAX_ROWS)}
					resize="vertical"
					value={value}
					aria-label={label}
					spellCheck={false}
					onInput={(event: FormEvent<VscodeTextarea>) => onValueChange(event.currentTarget.value)}
				/>
				<span className="literal-input-tag">{tag}</span>
			</span>
		);
	}

	return (
		<vscode-textfield
			{...textField}
			className={`input-field is-literal${numeric ? ' is-numeric' : ''}`}
			type={integer ? 'number' : 'text'}
			value={value}
			invalid={problem !== undefined}
			aria-label={label}
			spellCheck={false}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => onValueChange(event.currentTarget.value)}
		>
			<span slot="content-after" className="literal-input-tag">{tag}</span>
		</vscode-textfield>
	);
}
