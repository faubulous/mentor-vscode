import { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent, useId, useRef, useState } from 'react';
import { ResourceOptionData } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { useOverflowing } from '../hooks/use-overflowing';
import { LiteralTag } from '../state/literal-tag';
import { LiteralTagData } from './datatype-labels';
import { TagPicker } from './tag-picker';

/**
 * The tag a plain string shows while its value has the focus, which chooses a datatype for it.
 */
const PLAIN_TAG: LiteralTagData = { text: 'string', tooltip: 'Choose a datatype or language', accessibleName: 'Datatype string, change' };

/**
 * A whole number, which ↑ and ↓ step by one.
 */
const WHOLE_NUMBER = /^[+-]?\d+$/;

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
	 * The tag of the literal, shown after its text; none for a plain string.
	 */
	tag?: LiteralTagData;

	/**
	 * What an empty value shows: the text a value of its datatype is written as.
	 */
	placeholder: string;

	/**
	 * Why the text does not fit the datatype, shown under the value.
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
	 * Called when the value is finished, as Enter does.
	 */
	onFinish: () => void;

	/**
	 * Called when the value is left for the field of a new value, as Escape does.
	 */
	onLeave: () => void;

	/**
	 * Called when an empty value is removed, as Backspace does.
	 */
	onRemove: () => void;

	/**
	 * Called with the tag picked for the literal, and the datatype of the workspace it was picked
	 * from, if it was.
	 */
	onTagPick: (tag: LiteralTag, datatype?: ResourceOptionData) => void;
}

/**
 * A literal being edited: a text area laid over a hidden copy of its text, which gives the area its
 * height and puts the tag of the literal after the last character, so the tag wraps with the text.
 * At rest a long text shows as many lines as the density of the card allows, with the tag over the
 * end of the last line; with the focus the whole text shows. A plain string shows no tag at rest
 * and `string` while it has the focus. A text that does not fit the datatype shows the tag and
 * the reason under the value in the colour of errors. The tag opens the tag picker.
 * @param props The literal and its callbacks.
 * @returns The field.
 */
export function LiteralField(props: LiteralFieldProps): React.JSX.Element {
	const { index, text, tag, placeholder, problem, numeric, languages, services, onInput, onTagPick } = props;
	const [focused, setFocused] = useState(false);
	const [picking, setPicking] = useState(false);
	const textRef = useRef<HTMLSpanElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const problemId = useId();
	const clamped = useOverflowing(textRef, text) && !focused;
	const shownTag = tag ?? (focused ? PLAIN_TAG : undefined);

	const handleBlur = (event: FocusEvent<HTMLSpanElement>): void => {
		if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
			setFocused(false);
		}
	};

	// The picker goes with the focus in it, so the focus comes back to the text of the literal.
	const closePicker = (): void => {
		setPicking(false);
		inputRef.current?.focus();
	};

	const classes = ['literal-field', ...(problem ? ['is-problem'] : []), ...(clamped ? ['is-clamped'] : []), ...(numeric ? ['is-numeric'] : [])];

	return (
		<span className={classes.join(' ')} data-value-index={index} onFocus={() => setFocused(true)} onBlur={handleBlur}>
			<span className="literal-field-box input-field">
				<span ref={textRef} className="literal-field-text">
					<span className="literal-field-copy" aria-hidden="true">{`${text || placeholder}​`}</span>
					{shownTag && _tagButton(shownTag, problem, () => setPicking(current => !current))}
					<textarea
						ref={inputRef}
						className="literal-field-input"
						rows={1}
						value={text}
						placeholder={placeholder}
						spellCheck={false}
						aria-label={`Value ${index + 1}`}
						aria-invalid={problem !== undefined}
						aria-describedby={problem ? problemId : undefined}
						onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInput(event.currentTarget.value)}
						onKeyDown={event => _handleKeyDown(event, props)}
					/>
				</span>
			</span>
			{problem && <span id={problemId} className="literal-field-problem">{problem}</span>}
			{picking && (
				<TagPicker
					text={text}
					languages={languages}
					services={services}
					onPick={(picked, datatype) => {
						closePicker();
						onTagPick(picked, datatype);
					}}
					onCancel={closePicker}
				/>
			)}
		</span>
	);
}

/**
 * The tag after the text, which opens the tag picker. It acts on the press of the mouse, whose
 * default is prevented, so the text keeps the focus; a click by the keyboard opens it too.
 * @param tag The tag.
 * @param problem Why the text does not fit the datatype, if it does not.
 * @param onToggle Opens or closes the picker.
 * @returns The button.
 */
function _tagButton(tag: LiteralTagData, problem: string | undefined, onToggle: () => void): React.JSX.Element {
	const handleMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
		onToggle();
	};

	const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
		if (event.detail === 0) {
			onToggle();
		}
	};

	return (
		<button
			type="button"
			className="literal-field-tag"
			title={problem ?? tag.tooltip}
			aria-label={tag.accessibleName}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
		>
			{tag.text}
		</button>
	);
}

/**
 * Handle a key pressed in the text of a literal: Enter finishes the value, while Shift+Enter breaks
 * the line; Backspace removes an empty value; Escape goes to the field of a new value; ↑ and ↓
 * step a whole number by one, as a number field does.
 * @param event The event.
 * @param props The literal and its callbacks.
 */
function _handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, props: LiteralFieldProps): void {
	if (event.nativeEvent.isComposing) {
		return;
	}

	const { text, integer, onInput, onFinish, onLeave, onRemove } = props;

	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();

		if (text !== '') {
			onFinish();
		}
	} else if (event.key === 'Backspace' && text === '') {
		event.preventDefault();
		onRemove();
	} else if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		onLeave();
	} else if (integer && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && WHOLE_NUMBER.test(text)) {
		event.preventDefault();
		onInput((BigInt(text) + (event.key === 'ArrowUp' ? 1n : -1n)).toString());
	}
}
