import { useWebviewMessaging } from '@src/views/webviews/webview-hooks';
import { ExecuteCommandMessage } from '@src/views/webviews/webview-messaging';

/**
 * Identifies the template a {@link TemplatePreview} opens. A `global` target is backed by a
 * `mentor.<key>` setting; a `scratch` target carries the current text of a transient (not yet
 * persisted) value, such as a per-store query override held in a modal draft.
 */
export type EditTemplateTarget =
	| { kind: 'global'; key: string }
	| { kind: 'scratch'; token: string; content: string };

/**
 * Returns a callback that opens the given template in a real editor tab (via the
 * `mentor.command.editTemplate` command) so it gains syntax highlighting and triplate
 * code-lenses/execution. Changes flow back on save: global targets write the setting; scratch
 * targets notify the owning section through the file system provider.
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

export interface TemplatePreviewProps {
	/** Mentor language id (e.g. `sparql`, `turtle`) used for syntax highlighting and triplate support. */
	language: string;

	/** The template to open when the preview is activated. */
	target: EditTemplateTarget;

	/** The current template text shown in the preview. */
	value: string;

	/**
	 * When true the shown text is a fallback (e.g. the global default rather than a user/store value),
	 * so it is rendered muted to signal it is not an explicit override.
	 */
	muted?: boolean;

	disabled?: boolean;
}

/**
 * A read-only, editor-styled preview of a template. Clicking (or pressing Enter/Space) opens the
 * template in a real editor tab instead of editing inline — keeping the settings page compact while
 * the full editing experience (highlighting, triplate execution) happens in the editor.
 */
export function TemplatePreview({ language, target, value, muted, disabled }: TemplatePreviewProps) {
	const open = useOpenTemplateEditor(language, target);

	const activate = () => {
		if (!disabled) {
			open();
		}
	};

	return (
		<div
			className={`template-preview${muted ? ' template-preview-muted' : ''}`}
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			title={muted ? 'Showing the global default — click to edit' : 'Click to edit in editor'}
			onClick={activate}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			}}
		>
			<pre className="template-preview-code">{value}</pre>
		</div>
	);
}
