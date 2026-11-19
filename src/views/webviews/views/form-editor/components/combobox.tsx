import { FormEvent, KeyboardEvent, MouseEvent, ReactNode, Ref, RefCallback, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { ResourceIcon } from './resource-icon';

/**
 * How many options the list shows at most.
 */
const MAX_OPTIONS = 50;

/**
 * One option a combobox offers.
 */
export interface ComboboxOption<T> {
	/**
	 * The text the option is shown by.
	 */
	label: string;

	/**
	 * What is shown after the label, muted, such as an IRI.
	 */
	detail?: string;

	/**
	 * The glyph shown before the label, such as that of the kind of a term.
	 */
	iconName?: string;

	/**
	 * A remark shown after the label, such as what else picking the option does.
	 */
	hint?: string;

	/**
	 * What picking the option yields.
	 */
	value: T;
}

/**
 * Properties of the {@link Combobox} component.
 */
export interface ComboboxProps<T> {
	/**
	 * The text typed into the field.
	 */
	text: string;

	/**
	 * Called with the text as it is typed.
	 */
	onTextChange: (text: string) => void;

	/**
	 * The options that match the typed text, best first, as the caller matched them.
	 */
	options: readonly ComboboxOption<T>[];

	/**
	 * Whether the list opens when the field takes the focus, rather than once something is typed.
	 */
	openOnFocus?: boolean;

	/**
	 * Whether the field shows its placeholder and takes no typing, as while something else must be
	 * chosen first. It still takes the focus.
	 */
	readOnly?: boolean;

	/**
	 * Called with the value of the option picked.
	 */
	onPick: (value: T) => void;

	/**
	 * Called with the typed text when Enter is pressed and no option matches it.
	 */
	onCreate?: (text: string) => void;

	/**
	 * Called when Escape is pressed while the list is closed.
	 */
	onCancel?: () => void;

	/**
	 * Called with a key the combobox does not take, such as Backspace in the empty field.
	 */
	onKeyDown?: (event: KeyboardEvent<VscodeTextfield>) => void;

	/**
	 * Called when the field takes the focus.
	 */
	onFocus?: () => void;

	/**
	 * Called when the field loses the focus, after the list closed.
	 */
	onBlur?: () => void;

	/**
	 * What the field is called for assistive technology.
	 */
	label: string;

	/**
	 * The hint shown while nothing is typed.
	 */
	placeholder?: string;

	/**
	 * The tooltip of the field.
	 */
	title?: string;

	/**
	 * A class for the field.
	 */
	className?: string;

	/**
	 * The field, for the caller to focus.
	 */
	fieldRef?: Ref<VscodeTextfield>;

	/**
	 * What follows the text of the field, as the kind of a new value does: it stands right after the
	 * typed text, or after the placeholder while the field is empty.
	 */
	suffix?: ReactNode;
}

/**
 * A text field with a list of options under it, as a combobox does: the caller matches the options
 * to the typed text and ranks them, and they are shown as given, each on one line. Typing opens
 * the list and highlights the best match, the arrows move the highlight, Enter picks it or, with
 * no match, takes the typed text, Escape closes the list and with the list closed cancels, and a
 * click picks an option. The focus stays in the field throughout; the list opens in the top layer of the
 * page, so no card covers it, and is styled with the list colours of the theme. A suffix follows
 * the text, placed by a hidden copy of it.
 * @param props The text, the options and what to do with a pick.
 * @returns The combobox.
 */
export function Combobox<T>(props: ComboboxProps<T>): React.JSX.Element {
	const { text, onTextChange, options, openOnFocus = false, readOnly = false, onPick, onCreate, onCancel, onKeyDown, onFocus, onBlur, label, placeholder, title, className, fieldRef, suffix } = props;
	const listId = useId();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const matches = useMemo(() => options.slice(0, MAX_OPTIONS), [options]);
	const shown = open && !readOnly && matches.length > 0;
	const ownField = useRef<VscodeTextfield | null>(null);
	const setField = useCallback<RefCallback<VscodeTextfield>>(element => {
		ownField.current = element;
		_assignRef(fieldRef, element);
	}, [fieldRef]);

	// The text the field shows is set before anything moves the focus, as starting a literal does:
	// the field renders a new value later, and a blur in between would read the old one back.
	useLayoutEffect(() => {
		const input = ownField.current?.wrappedElement;

		if (input && input.value !== text) {
			input.value = text;
		}
	}, [text]);

	// The best match is highlighted while typing and as the options arrive, so Enter picks it.
	useEffect(() => setActive(0), [text, options]);

	const pick = (option: ComboboxOption<T>): void => {
		setOpen(false);
		onPick(option.value);
	};

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();

				if (!shown) {
					setOpen(true);
				} else {
					setActive(current => (current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
				}

				return;
			case 'Enter':
				event.preventDefault();
				event.stopPropagation();

				if (shown) {
					pick(matches[Math.min(active, matches.length - 1)]);
				} else if (text.trim() !== '') {
					onCreate?.(text);
				}

				return;
			case 'Escape':
				if (shown) {
					event.preventDefault();
					event.stopPropagation();
					setOpen(false);
				} else if (onCancel) {
					event.preventDefault();
					event.stopPropagation();
					onCancel();
				}

				return;
			case 'Tab':
				setOpen(false);
				return;
			default:
				onKeyDown?.(event);
		}
	};

	const handleInput = (event: FormEvent<VscodeTextfield>): void => {
		setOpen(true);
		onTextChange(event.currentTarget.value);
	};

	const handleFocus = (): void => {
		setOpen(openOnFocus);
		onFocus?.();
	};

	const handleBlur = (): void => {
		setOpen(false);
		onBlur?.();
	};

	return (
		<span className="combobox">
			<vscode-textfield
				ref={setField}
				className={`input-field${className ? ` ${className}` : ''}`}
				value={text}
				placeholder={placeholder}
				title={title}
				readonly={readOnly}
				aria-label={label}
				role="combobox"
				aria-expanded={shown}
				aria-controls={listId}
				aria-autocomplete="list"
				autocomplete="off"
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
				onBlur={handleBlur}
			/>
			{suffix && (
				<span className="combobox-suffix">
					<span className="combobox-suffix-copy" aria-hidden="true">{text || placeholder}</span>
					{suffix}
				</span>
			)}
			{shown && (
				<ul id={listId} ref={showInTopLayer} popover="manual" className="combobox-list" role="listbox" aria-label={label}>
					{matches.map((option, index) => (
						<li
							key={index}
							className={`combobox-option${index === active ? ' is-active' : ''}`}
							role="option"
							aria-selected={index === active}
							// The field keeps the focus, so the press must not take it.
							onMouseDown={(event: MouseEvent) => event.preventDefault()}
							onMouseEnter={() => setActive(index)}
							onClick={() => pick(option)}
						>
							{option.iconName && <ResourceIcon iconName={option.iconName} size={14} />}
							<span className="combobox-option-label">{option.label}</span>
							{option.detail && <span className="combobox-option-detail">{option.detail}</span>}
							{option.hint && <span className="combobox-option-hint">{option.hint}</span>}
						</li>
					))}
				</ul>
			)}
			<span className="combobox-status" role="status" aria-live="polite">{shown ? matches[active]?.label : ''}</span>
		</span>
	);
}

/**
 * Show a pop-up in the top layer of the page, above the cards and bars that would cover it,
 * placed by the anchor its styles name; used as the ref of a popover element.
 * @param popup The pop-up, or `null` once it is gone.
 */
export function showInTopLayer(popup: HTMLElement | null): void {
	if (popup && typeof popup.showPopover === 'function' && !popup.matches(':popover-open')) {
		popup.showPopover();
	}
}

/**
 * Hand an element to a ref the caller passed, an object or a function.
 * @param ref The ref, if any.
 * @param element The element, or `null` once it is gone.
 */
function _assignRef<T>(ref: Ref<T> | undefined, element: T | null): void {
	if (typeof ref === 'function') {
		ref(element);
	} else if (ref) {
		ref.current = element;
	}
}
