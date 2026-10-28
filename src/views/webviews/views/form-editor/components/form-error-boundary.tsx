import { Component, ReactNode } from 'react';

/**
 * Properties of the {@link FormErrorBoundary} component.
 */
export interface FormErrorBoundaryProps {
	/**
	 * The form.
	 */
	children: ReactNode;

	/**
	 * Opens the document in the text editor.
	 */
	onOpenTextEditor: () => void;

	/**
	 * Changes when the document changes, which gives the form another try.
	 */
	resetKey?: unknown;
}

/**
 * The state of the {@link FormErrorBoundary} component.
 */
interface FormErrorBoundaryState {
	/**
	 * The error that stopped the form, when one did.
	 */
	error?: Error;

	/**
	 * The reset key the error was caught under.
	 */
	resetKey?: unknown;
}

/**
 * Catches an error while the form renders and says so, with the way to the text editor, instead
 * of leaving the editor blank. The next change of the document tries the form again.
 */
export class FormErrorBoundary extends Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
	state: FormErrorBoundaryState = {};

	/**
	 * Remember the error, so the next render shows it.
	 * @param error The error thrown while rendering.
	 * @returns The state change.
	 */
	static getDerivedStateFromError(error: Error): Partial<FormErrorBoundaryState> {
		return { error };
	}

	/**
	 * Forget the error when the document changed.
	 * @param props The new properties.
	 * @param state The current state.
	 * @returns The state change, or `null` when the document is the same.
	 */
	static getDerivedStateFromProps(props: FormErrorBoundaryProps, state: FormErrorBoundaryState): Partial<FormErrorBoundaryState> | null {
		return props.resetKey !== state.resetKey ? { error: undefined, resetKey: props.resetKey } : null;
	}

	/**
	 * Log the error for the developer tools of the webview.
	 * @param error The error thrown while rendering.
	 */
	componentDidCatch(error: Error): void {
		console.error('The form editor failed to render', error);
	}

	/**
	 * Render the form, or the error that stopped it.
	 * @returns The form or the error state.
	 */
	render(): ReactNode {
		if (!this.state.error) {
			return this.props.children;
		}

		return (
			<div className="form-editor-state" role="alert">
				<vscode-icon name="error" size={32}></vscode-icon>
				<div className="form-editor-state-message">The form could not be shown: {this.state.error.message}</div>
				<div className="form-editor-state-actions">
					<vscode-button secondary onClick={this.props.onOpenTextEditor}>Open in Text Editor</vscode-button>
				</div>
			</div>
		);
	}
}
