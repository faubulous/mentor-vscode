import * as React from 'react';
import { useWebviewMessaging } from '@src/views/webviews/hooks';
import { ExecuteCommandMessage } from '@src/views/webviews/webview-messaging';

/**
 * A read-only, editor-styled preview of a template. Clicking (or pressing Enter/Space) opens the
 * template in a real editor tab instead of editing inline — keeping the settings page compact while
 * the full editing experience (highlighting, triplate execution) happens in the editor.
 */
export function TemplatePreview({ language, target, value, muted, readOnly, onReset }: TemplatePreviewProps) {
	const open = useOpenTemplateEditor(language, target);

	const activate = () => {
		if (!readOnly) {
			open();
		}
	};

	const reset = (e: React.MouseEvent | React.KeyboardEvent) => {
		// Keep the reset action from also activating the surrounding click-to-edit cell.
		e.stopPropagation();
		onReset?.();
	};

	const hint = muted
		? 'Showing the global default — click to edit. Save editor to update.'
		: 'Click to edit. Save editor to update.';

	return (
		<div
			className={`template-preview${muted ? ' template-preview-muted' : ''}`}
			role="button"
			tabIndex={readOnly ? -1 : 0}
			aria-disabled={readOnly}
			onClick={activate}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			}}
		>
			<pre className="template-preview-code">{value}</pre>
			{!readOnly && (
				<span className="template-preview-hint">
					<span className="template-preview-hint-text" aria-hidden="true">{hint}</span>
					{onReset && (
						<button
							type="button"
							className="template-preview-hint-reset"
							onClick={reset}
							onKeyDown={(e) => {
								// Native button handles its own activation; stop the key from reaching the cell.
								if (e.key === 'Enter' || e.key === ' ') {
									e.stopPropagation();
								}
							}}
						>
							Reset to Default
						</button>
					)}
				</span>
			)}
		</div>
	);
}

/**
 * Properties for a {@link TemplatePreview} component.
 */
export interface TemplatePreviewProps {
	/** 
	 * A supported Mentor language id (e.g. `sparql`, `turtle`) used for syntax highlighting and triplate support.
	 */
	language: string;

	/**
	 * The template to open when the preview is activated.
	 */
	target: EditTemplateTarget;

	/**
	 * The current template text shown in the preview.
	 */
	value: string;

	/**
	 * When `true` the shown text is a fallback (e.g. the global default rather than a user/store value),
	 * so it is rendered muted to signal it is not an explicit override.
	 */
	muted?: boolean;

	/**
	 * Indicates if the preview is disabled (e.g. because the template is not editable in this context).
	 */
	readOnly?: boolean;

	/**
	 * When provided, a "Reset to Default" link is shown in the hover/focus hint that empties the
	 * current value. Omit it (e.g. when the value already uses the default) to hide the link.
	 */
	onReset?: () => void;
}

/**
 * Returns a callback that opens the given template in a real editor tab (via the
 * `mentor.command.editTemplate` command) so it gains syntax highlighting and triplate
 * code-lenses/execution. Changes flow back on save: global targets write the setting; scratch
 * targets notify the owning section through the file system provider.
 * @param language The target document language.
 * @param target Options for identifying the template to be edited.
 */
export function useOpenTemplateEditor(language: string, target: EditTemplateTarget): () => void {
	const messaging = useWebviewMessaging<ExecuteCommandMessage>();

	return () => {
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.editTemplate',
			args: [{ ...target, language }],
		});
	};
}

/**
 * Identifies the template a {@link TemplatePreview} opens. A `global` target is backed by a
 * `mentor.<key>` setting; a `scratch` target carries the current text of a transient (not yet
 * persisted) value, such as a per-store query override held in a modal draft.
 */
export type EditTemplateTarget =
	| { kind: 'global'; key: string }
	| { kind: 'scratch'; token: string; content: string };