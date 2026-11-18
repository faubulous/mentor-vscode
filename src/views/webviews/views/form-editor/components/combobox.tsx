import { FormEvent, KeyboardEvent, MouseEvent, Ref, useEffect, useId, useMemo, useState } from 'react';
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
	 * The text the option is shown and filtered by.
	 */
	label: string;

	/**
	 * What is shown after the label, muted, such as an IRI.
	 */
	detail?: string;

	/**
	 * What the typed text is matched against besides the label, such as a prefixed name.
	 */
	keywords?: string;

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
	 * The options, which the typed text filters.
	 */
	options: readonly ComboboxOption<T>[];

	/**
	 * Whether the options are filtered and ranked for the text already, as by a search, and are
	 * shown as given rather than filtered by the typed text.
	 */
	ranked?: boolean;

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
}

/**
 * A text field with a list of options under it that the typed text filters, as a combobox does:
 * typing opens the list and highlights the best match, the arrows move the highlight, Enter picks
 * it or, with no match, takes the typed text, Escape closes the list and with the list closed
 * cancels, and a click picks an option. Options a search ranked already are shown as given, each
 * on one line. The focus stays in the field throughout; the list opens in the top layer of the
 * page, so no card covers it, and is styled with the list colours of the theme.
 * @param props The text, the options and what to do with a pick.
 * @returns The combobox.
 */
export function Combobox<T>(props: ComboboxProps<T>): React.JSX.Element {
	const { text, onTextChange, options, ranked = false, openOnFocus = false, readOnly = false, onPick, onCreate, onCancel, onKeyDown, onFocus, onBlur, label, placeholder, title, className, fieldRef } = props;
	const listId = useId();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const matches = useMemo(() => (ranked ? [...options] : _rank(options, text)).slice(0, MAX_OPTIONS), [options, ranked, text]);
	const shown = open && !readOnly && matches.length > 0;

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
				ref={fieldRef}
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
			{shown && (
				<ul id={listId} ref={_showAsPopover} popover="manual" className="combobox-list" role="listbox" aria-label={label}>
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
 * Show the list in the top layer of the page, above the cards and bars that would cover it,
 * placed under the field it is anchored to.
 * @param list The list, or `null` once it is gone.
 */
function _showAsPopover(list: HTMLUListElement | null): void {
	if (list && typeof list.showPopover === 'function' && !list.matches(':popover-open')) {
		list.showPopover();
	}
}

/**
 * Rank the options a text matches: those whose label starts with it first, then those whose label
 * contains it, then those whose keywords do; all of them while nothing is typed.
 * @param options The options.
 * @param text The typed text.
 * @returns The matching options, best first.
 */
function _rank<T>(options: readonly ComboboxOption<T>[], text: string): ComboboxOption<T>[] {
	const query = text.trim().toLowerCase();

	if (query === '') {
		return [...options];
	}

	const score = (option: ComboboxOption<T>): number => {
		const label = option.label.toLowerCase();

		if (label.startsWith(query)) {
			return 0;
		}

		if (label.includes(query)) {
			return 1;
		}

		return option.keywords?.toLowerCase().includes(query) ? 2 : -1;
	};

	return options.map(option => ({ option, rank: score(option) })).filter(entry => entry.rank >= 0).sort((a, b) => a.rank - b.rank).map(entry => entry.option);
}
