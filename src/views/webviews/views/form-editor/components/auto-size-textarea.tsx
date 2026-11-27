import { ReactNode, Ref, TextareaHTMLAttributes } from 'react';

/**
 * Properties of the {@link AutoSizeTextarea} component.
 */
export interface AutoSizeTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'className'> {
	/**
	 * The text.
	 */
	value: string;

	/**
	 * The class name of the box that holds the text, besides its own.
	 */
	className?: string;

	/**
	 * The class name of the text area, besides its own.
	 */
	inputClassName?: string;

	/**
	 * Holds the box that holds the text.
	 */
	textRef?: Ref<HTMLSpanElement>;

	/**
	 * Holds the text area.
	 */
	inputRef?: Ref<HTMLTextAreaElement>;

	/**
	 * What follows the text in its flow, such as the annotation of a literal, which then wraps with
	 * the text.
	 */
	children?: ReactNode;
}

/**
 * A text area as high as its text: it lies over a hidden copy of the text, which gives the box its
 * height as the text wraps, so the area grows and shrinks with every line typed.
 * @param props The text and the attributes of the text area.
 * @returns The box with the text area.
 */
export function AutoSizeTextarea({ value, placeholder, className, inputClassName, textRef, inputRef, children, ...attributes }: AutoSizeTextareaProps): React.JSX.Element {
	return (
		<span ref={textRef} className={`auto-size-text${className ? ` ${className}` : ''}`}>
			<span className="auto-size-copy" aria-hidden="true">{`${value || placeholder || ''}​`}</span>
			{children}
			<textarea
				ref={inputRef}
				className={`auto-size-input${inputClassName ? ` ${inputClassName}` : ''}`}
				rows={1}
				value={value}
				placeholder={placeholder}
				spellCheck={false}
				{...attributes}
			/>
		</span>
	);
}
