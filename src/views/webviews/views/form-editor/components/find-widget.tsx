import { FormEvent, KeyboardEvent, Ref } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';

/**
 * Properties of the {@link FindWidget} component.
 */
export interface FindWidgetProps {
	/**
	 * The text typed so far.
	 */
	text: string;

	/**
	 * Called with the text as it is typed.
	 */
	onChange: (text: string) => void;

	/**
	 * The definition tree node the list is narrowed to, shown as a token before the text.
	 */
	token?: string;

	/**
	 * Called when the token is cleared.
	 */
	onClearToken?: () => void;

	/**
	 * How many resources the find lets through.
	 */
	matchCount: number;

	/**
	 * The index of the match stepped to last, if any.
	 */
	matchIndex?: number;

	/**
	 * Step to the previous match.
	 */
	onPrevious: () => void;

	/**
	 * Step to the next match.
	 */
	onNext: () => void;

	/**
	 * Close the widget, which shows all resources again.
	 */
	onClose: () => void;

	/**
	 * The text field, which Ctrl+F (⌘F on a Mac) brings the caret into.
	 */
	fieldRef?: Ref<VscodeTextfield>;
}

/**
 * The find of the form, as the text editor of VS Code has it: a widget at the top right of the
 * editor that narrows the list to the resources whose label, description or IRI contains the text,
 * after the definition tree node chosen in the tree, if any. It tells which match was stepped to
 * of how many; Enter and the down arrow button step to the next, Shift+Enter and the up arrow
 * button to the previous, and Escape or the close button close it.
 * @param props The text, the token, the matches and their callbacks.
 * @returns The widget.
 */
export function FindWidget(props: FindWidgetProps): React.JSX.Element {
	const { text, onChange, token, onClearToken, matchCount, matchIndex, onPrevious, onNext, onClose, fieldRef } = props;
	const finding = text.trim() !== '' || token !== undefined;

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();

			if (event.shiftKey) {
				onPrevious();
			} else {
				onNext();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		}
	};

	return (
		<div className="find-widget" role="search" aria-label="Find in the form">
			{token && (
				<span className="find-widget-token">
					{token}
					<button type="button" className="find-widget-token-clear" aria-label={`Show all resources, not only ${token}`} onClick={onClearToken}>
						<vscode-icon name="close" size={10}></vscode-icon>
					</button>
				</span>
			)}
			<vscode-textfield
				ref={fieldRef}
				className="find-widget-input"
				placeholder="Find"
				aria-label="Find"
				value={text}
				onInput={(event: FormEvent<VscodeTextfield>) => onChange(event.currentTarget.value ?? '')}
				onKeyDown={handleKeyDown}
			/>
			<span className={`find-widget-count${finding && matchCount === 0 ? ' is-empty' : ''}`} aria-live="polite">
				{_countOf(finding, matchCount, matchIndex)}
			</span>
			<button type="button" className="find-widget-button" aria-label="Previous Match (Shift+Enter)" title="Previous Match (Shift+Enter)" disabled={matchCount === 0} onClick={onPrevious}>
				<vscode-icon name="arrow-up" size={16}></vscode-icon>
			</button>
			<button type="button" className="find-widget-button" aria-label="Next Match (Enter)" title="Next Match (Enter)" disabled={matchCount === 0} onClick={onNext}>
				<vscode-icon name="arrow-down" size={16}></vscode-icon>
			</button>
			<button type="button" className="find-widget-button" aria-label="Close (Escape)" title="Close (Escape)" onClick={onClose}>
				<vscode-icon name="close" size={16}></vscode-icon>
			</button>
		</div>
	);
}

/**
 * Tell which match was stepped to of how many, as the find of VS Code does.
 * @param finding Whether a text or a token narrows the list.
 * @param matchCount How many resources match.
 * @param matchIndex The index of the match stepped to last, if any.
 * @returns The text, empty while nothing is looked for.
 */
function _countOf(finding: boolean, matchCount: number, matchIndex: number | undefined): string {
	if (!finding) {
		return '';
	}

	if (matchCount === 0) {
		return 'No results';
	}

	return matchIndex === undefined ? `${matchCount} found` : `${matchIndex + 1} of ${matchCount}`;
}
