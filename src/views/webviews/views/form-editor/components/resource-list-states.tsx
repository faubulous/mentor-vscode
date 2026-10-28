import { DocumentProblem, ReadOnlyReason } from '../form-editor-model';

/**
 * Properties of the {@link LoadingState} component.
 */
export interface LoadingStateProps {
	/**
	 * What is being loaded.
	 */
	message?: string;
}

/**
 * Shown while the first snapshot of a document is being built.
 * @param props The message.
 * @returns The state.
 */
export function LoadingState({ message = 'Loading document…' }: LoadingStateProps): React.JSX.Element {
	return (
		<div className="form-editor-state">
			<vscode-progress-ring></vscode-progress-ring>
			<div className="form-editor-state-message">{message}</div>
		</div>
	);
}

/**
 * Properties of the {@link EmptyState} component.
 */
export interface EmptyStateProps {
	/**
	 * Opens the document in the text editor.
	 */
	onOpenTextEditor: () => void;
}

/**
 * Shown for a document that parses but describes nothing.
 * @param props The way to the text editor.
 * @returns The state.
 */
export function EmptyState({ onOpenTextEditor }: EmptyStateProps): React.JSX.Element {
	return (
		<div className="form-editor-state">
			<vscode-icon name="mentor-rdf-file" size={32}></vscode-icon>
			<div className="form-editor-state-message">This file does not describe any resources yet.</div>
			<div className="form-editor-state-actions">
				<vscode-button secondary onClick={onOpenTextEditor}>Open in Text Editor</vscode-button>
			</div>
		</div>
	);
}

/**
 * Properties of the {@link ProblemState} component.
 */
export interface ProblemStateProps {
	/**
	 * Why the document cannot be shown as a form.
	 */
	readOnly: ReadOnlyReason;

	/**
	 * The problems of the document.
	 */
	problems: DocumentProblem[];

	/**
	 * Reveals a problem in the text editor.
	 */
	onRevealProblem: (problem: DocumentProblem) => void;

	/**
	 * Opens the document in the text editor.
	 */
	onOpenTextEditor: () => void;
}

/**
 * Shown for a document that cannot be rendered as a form. A stale form is deliberately never
 * shown beside a parse error: a form that looks editable over text that could not be parsed is
 * the most misleading state the editor could present.
 * @param props The reason, the problems and the ways to the text editor.
 * @returns The state.
 */
export function ProblemState({ readOnly, problems, onRevealProblem, onOpenTextEditor }: ProblemStateProps): React.JSX.Element {
	const first = problems[0];

	return (
		<div className="form-editor-state">
			<vscode-icon name={readOnly.reason === 'template' ? 'file-code' : 'error'} size={32}></vscode-icon>
			<div className="form-editor-state-message">{readOnly.message}</div>
			{first && (
				<div className="form-editor-state-message">
					<code>{first.message}</code>
				</div>
			)}
			<div className="form-editor-state-actions">
				{first && <vscode-button secondary onClick={() => onRevealProblem(first)}>Go to Problem</vscode-button>}
				<vscode-button secondary onClick={onOpenTextEditor}>Open in Text Editor</vscode-button>
			</div>
		</div>
	);
}

/**
 * Properties of the {@link ReadOnlyBanner} component.
 */
export interface ReadOnlyBannerProps {
	/**
	 * Why the document cannot be edited.
	 */
	readOnly: ReadOnlyReason;

	/**
	 * Opens the document in the text editor.
	 */
	onOpenTextEditor: () => void;
}

/**
 * Shown above a form that can be read but not edited.
 * @param props The reason and the way to the text editor.
 * @returns The banner.
 */
export function ReadOnlyBanner({ readOnly, onOpenTextEditor }: ReadOnlyBannerProps): React.JSX.Element {
	return (
		<div className="form-editor-banner">
			<vscode-icon name="warning"></vscode-icon>
			<div className="form-editor-banner-text">{readOnly.message}</div>
			<vscode-button secondary onClick={onOpenTextEditor}>Open in Text Editor</vscode-button>
		</div>
	);
}
