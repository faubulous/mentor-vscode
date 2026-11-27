import { ChangeEvent, FocusEvent, KeyboardEvent, useId, useRef, useState } from 'react';
import { useOverflowing } from '../hooks/use-overflowing';
import { AutoSizeTextarea } from './auto-size-textarea';
import { useLiteralAnnotationPicker } from '../hooks/use-literal-annotation-picker';
import { LiteralAnnotation } from '../state/literal-annotation';
import { LiteralAnnotationData } from './datatype-labels';
import { LiteralAnnotationButton } from './literal-annotation-button';
import { LiteralAnnotationPicker } from './literal-annotation-picker';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';

/**
 * The annotation a plain string shows while its value has the focus, which chooses a datatype for it.
 */
const PLAIN_ANNOTATION: LiteralAnnotationData = { text: 'string', tooltip: 'Choose a datatype or language', accessibleName: 'Datatype string, change' };

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
	 * The annotation of the literal as its field shows it after the text; none for a plain string.
	 */
	annotation?: LiteralAnnotationData;

	/**
	 * The language or datatype of the literal, which the annotation picker highlights.
	 */
	current: LiteralAnnotation;

	/**
	 * What an empty value shows: the text a value of its datatype is written as.
	 */
	placeholder: string;

	/**
	 * Why the text does not fit the datatype, shown under the value.
	 */
	problem?: string;

	/**
	 * The annotation of the datatype a plain string looks like a value of, which the focused value
	 * shows in place of its own annotation and Tab or a click accepts.
	 */
	suggestion?: LiteralAnnotationData;

	/**
	 * Whether the value is a number, written in the editor font.
	 */
	numeric: boolean;

	/**
	 * Whether the value is a whole number, which ↑ and ↓ step by one.
	 */
	integer: boolean;

	/**
	 * The languages of the card, which the annotation picker offers first.
	 */
	languages: readonly string[];

	/**
	 * Whether the annotation picker offers to make the value a resource.
	 */
	offersResource: boolean;

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
	 * Called with what the item picked from the annotation picker gives the literal.
	 */
	onAnnotationPick: (selection: LiteralAnnotationPickerSelection) => void;

	/**
	 * Called when the suggested datatype is accepted, as Tab does.
	 */
	onAcceptSuggestion: () => void;
}

/**
 * A literal being edited: a text area laid over a hidden copy of its text, which gives the area its
 * height and puts the annotation of the literal after the last character, so the annotation wraps
 * with the text. At rest a long text shows as many lines as the density of the card allows, with the
 * annotation over the end of the last line; with the focus the whole text shows. A plain string shows
 * no annotation at rest
 * and `string` while it has the focus and text, or the datatype its text looks like a value of,
 * such as `date?`, which Tab or a click accepts and nothing applies by itself; both ignore the
 * pointer for a moment as they appear, so a click meant for the text does not land on them. A text that does not fit the
 * datatype shows the annotation and the reason under the value in the colour of errors. The
 * annotation opens the annotation picker.
 * @param props The literal and its callbacks.
 * @returns The field.
 */
export function LiteralField(props: LiteralFieldProps): React.JSX.Element {
	const { index, text, annotation, current, placeholder, problem, suggestion, numeric, languages, offersResource, onInput, onAnnotationPick, onAcceptSuggestion } = props;
	const [focused, setFocused] = useState(false);
	const textRef = useRef<HTMLSpanElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const problemId = useId();
	const listId = useId();
	const picker = useLiteralAnnotationPicker({ current, languages, resourceItemPosition: offersResource ? 'last' : undefined, onPick: onAnnotationPick, onDone: () => inputRef.current?.focus() });
	const clamped = useOverflowing(textRef, text) && !focused;
	const suggested = focused && !picker.open ? suggestion : undefined;
	// A plain string shows string once it has text, so focusing an empty value shows the placeholder only.
	const shownAnnotation = annotation ?? (focused && text !== '' ? PLAIN_ANNOTATION : undefined);

	const handleBlur = (event: FocusEvent<HTMLSpanElement>): void => {
		if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
			setFocused(false);
			picker.close();
		}
	};

	// The filter of the picker takes the focus as it opens, and gives it back to the text as the annotation closes it.
	const togglePicker = (): void => {
		if (picker.open) {
			inputRef.current?.focus();
		}

		picker.toggle();
	};

	const classes = ['literal-field', ...(problem ? ['is-problem'] : []), ...(clamped ? ['is-clamped'] : []), ...(numeric ? ['is-numeric'] : [])];

	return (
		<span className={classes.join(' ')} data-value-index={index} onFocus={() => setFocused(true)} onBlur={handleBlur}>
			<span className="literal-field-box input-field">
				<AutoSizeTextarea
					className="literal-field-text"
					inputClassName="literal-field-input"
					textRef={textRef}
					inputRef={inputRef}
					value={text}
					placeholder={placeholder}
					aria-label={`Value ${index + 1}`}
					aria-invalid={problem !== undefined}
					aria-describedby={problem ? problemId : undefined}
					onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInput(event.currentTarget.value)}
					onKeyDown={event => _handleKeyDown(event, props)}
				>
					{suggested
						? <LiteralAnnotationButton key={suggested.text} annotation={suggested} variant="is-suggestion" guarded onAct={onAcceptSuggestion} />
						: shownAnnotation && <LiteralAnnotationButton key={shownAnnotation.text} annotation={shownAnnotation} problem={problem} guarded={annotation === undefined} onAct={togglePicker} />}
				</AutoSizeTextarea>
			</span>
			{problem && <span id={problemId} className="literal-field-problem">{problem}</span>}
			{picker.open && <LiteralAnnotationPicker picker={picker} listId={listId} />}
		</span>
	);
}

/**
 * Handle a key pressed in the text of a literal: Enter finishes the value, while Shift+Enter breaks
 * the line; Tab accepts the suggested datatype, where there is one; Backspace removes an empty
 * value; Escape goes to the field of a new value; ↑ and ↓ step a whole number by one, as a number
 * field does.
 * @param event The event.
 * @param props The literal and its callbacks.
 */
function _handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, props: LiteralFieldProps): void {
	if (event.nativeEvent.isComposing) {
		return;
	}

	const { text, integer, suggestion, onInput, onFinish, onLeave, onRemove, onAcceptSuggestion } = props;

	if (event.key === 'Tab' && !event.shiftKey && suggestion) {
		event.preventDefault();
		onAcceptSuggestion();
	} else if (event.key === 'Enter' && !event.shiftKey) {
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
