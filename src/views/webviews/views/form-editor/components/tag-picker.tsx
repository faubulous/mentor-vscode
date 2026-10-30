import { useCallback, useEffect, useRef } from 'react';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks/use-vscode-element-ref';

/**
 * A tag the picker offers: a language or a datatype.
 */
export interface TagOption {
	/**
	 * The text shown for the tag.
	 */
	label: string;

	/**
	 * The tag as written: `@language` or `^^datatype`.
	 */
	suffix: string;

	/**
	 * What is shown under the label: the prefixed name and the IRI of a datatype.
	 */
	description?: string;
}

/**
 * Properties of the {@link TagPicker} component.
 */
export interface TagPickerProps {
	/**
	 * The tags on offer.
	 */
	options: readonly TagOption[];

	/**
	 * The tag the literal has, which the picker starts on.
	 */
	current: string;

	/**
	 * Called with the tag picked, or typed: a language code, or a datatype as a prefixed name.
	 */
	onPick: (suffix: string) => void;

	/**
	 * Called when the picker is left without a pick.
	 */
	onCancel: () => void;
}

/**
 * The picker of the language tag or datatype of a literal: a creatable combobox in the slot after
 * the text of the literal, which offers the datatypes the text fits and the languages of the card,
 * and takes a typed language code or datatype as well. Escape and leaving cancel it.
 * @param props The tags on offer and what to do with the pick.
 * @returns The picker.
 */
export function TagPicker({ options, current, onPick, onCancel }: TagPickerProps): React.JSX.Element {
	const picked = useRef(false);

	const handleChange = useCallback((element: VscodeSingleSelect) => {
		picked.current = true;
		onPick(_suffixOfPick(element.value, options));
	}, [onPick, options]);

	const ref = useVscodeElementRef<VscodeSingleSelect>('change', handleChange);
	const elementRef = useRef<VscodeSingleSelect | null>(null);
	const latest = useRef({ options, onPick, onCancel });

	latest.current = { options, onPick, onCancel };

	const mount = useCallback((element: VscodeSingleSelect | null) => {
		ref(element);
		elementRef.current = element;

		if (element) {
			element.options = options.map(option => ({ label: option.label, value: option.suffix, description: option.description ?? '', selected: option.suffix === current, disabled: false }));
			void Promise.resolve(element.updateComplete).then(() => element.focus());
		}
	}, [ref, options, current]);

	// The keys are taken before the library sees them, on the way down to its input: the library
	// highlights nothing while one types, so Enter would do nothing, and would clear the text.
	useEffect(() => {
		const element = elementRef.current;

		if (!element) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent): void => {
			// The keys of the picker are its own; the field it sits in must not act on them.
			event.stopPropagation();

			if (event.key === 'Escape' && !element.open) {
				event.preventDefault();
				latest.current.onCancel();
			}

			if (event.key === 'Enter' && !_hasHighlightedOption(element)) {
				event.preventDefault();
				picked.current = true;
				latest.current.onPick(_suffixOfTyped(_typedTextOf(element), latest.current.options));
			}
		};

		element.addEventListener('keydown', handleKeyDown, true);

		return () => element.removeEventListener('keydown', handleKeyDown, true);
	}, []);

	const handleBlur = (): void => {
		// The focus moves within the picker while its list opens; only a focus that stays away cancels.
		window.setTimeout(() => {
			if (!picked.current) {
				onCancel();
			}
		}, 150);
	};

	return <vscode-single-select ref={mount} className="tag-picker" combobox creatable filter="contains" aria-label="Language or datatype" onBlur={handleBlur}></vscode-single-select>;
}

/**
 * Indicate whether the list of the picker has a highlighted option, which Enter picks. Read from
 * the library's own bookkeeping, which has no public counterpart.
 * @param element The picker.
 * @returns `true` when an option is highlighted.
 */
function _hasHighlightedOption(element: VscodeSingleSelect): boolean {
	const activeIndex = (element as unknown as { _opts?: { activeIndex?: number } })._opts?.activeIndex ?? -1;

	return element.open && activeIndex >= 0;
}

/**
 * The text typed into the picker, which lives in the input of its shadow root.
 * @param element The picker.
 * @returns The text.
 */
function _typedTextOf(element: VscodeSingleSelect): string {
	return element.shadowRoot?.querySelector<HTMLInputElement>('.combobox-input')?.value ?? '';
}

/**
 * The tag a typed text stands for: the offered tag whose label it is, else the one its label
 * starts with when there is just one, else the text as a language code or a datatype name.
 * @param text The typed text.
 * @param options The tags on offer.
 * @returns The tag as written.
 */
function _suffixOfTyped(text: string, options: readonly TagOption[]): string {
	const typed = text.trim();
	const lower = typed.toLowerCase();
	const named = options.find(option => option.label.toLowerCase() === lower);
	const starting = options.filter(option => option.label.toLowerCase().startsWith(lower));

	if (named) {
		return named.suffix;
	}

	if (typed !== '' && starting.length === 1) {
		return starting[0].suffix;
	}

	return _suffixOfPick(typed, options);
}

/**
 * The tag a pick stands for: an offered tag by its written form, else a typed language code or
 * datatype name.
 * @param value The value of the pick.
 * @param options The tags on offer.
 * @returns The tag as written.
 */
function _suffixOfPick(value: string, options: readonly TagOption[]): string {
	const typed = value.trim();

	if (options.some(option => option.suffix === typed) || typed === '') {
		return typed;
	}

	if (typed.startsWith('@') || typed.startsWith('^^')) {
		return typed;
	}

	return /^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/.test(typed) ? `@${typed}` : `^^${typed}`;
}
