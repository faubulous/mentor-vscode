import { FormEvent, KeyboardEvent, Ref } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';

/**
 * Properties of the {@link FilterField} component.
 */
export interface FilterFieldProps {
	/**
	 * The text typed so far.
	 */
	text: string;

	/**
	 * Called with the text as it is typed, and with an empty text when the filter is cleared.
	 */
	onChange: (text: string) => void;

	/**
	 * How many resources the filter lets through, shown while it narrows the list.
	 */
	matchCount?: number;

	/**
	 * The definition tree node the list is narrowed to, shown as a token before the text.
	 */
	token?: string;

	/**
	 * Called when the token is cleared.
	 */
	onClearToken?: () => void;

	/**
	 * The key that brings the caret into the field, shown while it is empty.
	 */
	shortcut?: string;

	/**
	 * The text field, which the shortcut brings the caret into.
	 */
	fieldRef?: Ref<VscodeTextfield>;
}

/**
 * The field that narrows the list to the resources whose label, description or IRI contains the
 * text, after the definition tree node chosen in the tree, if any. While it narrows the list it
 * shows how many match and a button that clears it; Escape clears it too.
 * @param props The text, the token and their callbacks.
 * @returns The field.
 */
export function FilterField({ text, onChange, matchCount, token, onClearToken, shortcut, fieldRef }: FilterFieldProps): React.JSX.Element {
	const active = text.trim() !== '' || token !== undefined;

	const handleInput = (event: FormEvent<VscodeTextfield>): void => {
		onChange(event.currentTarget.value ?? '');
	};

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Escape' && text) {
			event.preventDefault();
			event.stopPropagation();
			onChange('');
		}
	};

	return (
		<div className={`filter-field${active ? ' is-active' : ''}`}>
			{token && (
				<span className="filter-token">
					{token}
					<button type="button" className="filter-token-clear" aria-label={`Show all resources, not only ${token}`} onClick={onClearToken}>
						<vscode-icon name="close" size={10}></vscode-icon>
					</button>
				</span>
			)}
			<vscode-textfield
				ref={fieldRef}
				className="filter-input"
				type="search"
				placeholder="Filter resources"
				aria-label="Filter resources"
				value={text}
				onInput={handleInput}
				onKeyDown={handleKeyDown}
			>
				<vscode-icon slot="content-before" name="search" size={14}></vscode-icon>
				{active && matchCount !== undefined && <span slot="content-after" className="filter-count">{matchCount}</span>}
				{text.trim() !== ''
					? (
						<button slot="content-after" type="button" className="filter-clear" aria-label="Clear filter" onClick={() => onChange('')}>
							<vscode-icon name="close" size={11}></vscode-icon>
						</button>
					)
					: !active && shortcut && <kbd slot="content-after" className="filter-shortcut">{shortcut}</kbd>}
			</vscode-textfield>
		</div>
	);
}
