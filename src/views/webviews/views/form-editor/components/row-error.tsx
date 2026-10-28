/**
 * Properties of the {@link RowError} component.
 */
export interface RowErrorProps {
	/**
	 * The explanation shown to the user.
	 */
	message: string;

	/**
	 * Removes the error; the error stays until the row is written again when absent.
	 */
	onDismiss?: () => void;
}

/**
 * Why a row was not written, shown under the row rather than in a dialog so the user stays
 * where they were: the reason the host did not apply an edit, or what keeps the text of the row
 * from being a statement.
 * @param props The message and how it is dismissed.
 * @returns The error.
 */
export function RowError({ message, onDismiss }: RowErrorProps): React.JSX.Element {
	return (
		<div className="row-error" role="alert">
			<vscode-icon name="error" size={12}></vscode-icon>
			<span className="row-error-message">{message}</span>
			{onDismiss && (
				<button type="button" className="row-error-dismiss" title="Dismiss" aria-label="Dismiss" onClick={onDismiss}>
					<vscode-icon name="close" size={12}></vscode-icon>
				</button>
			)}
		</div>
	);
}
