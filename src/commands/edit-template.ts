import * as vscode from 'vscode';
import { TemplateFileSystemProvider } from '@src/providers/template-file-system-provider';

/**
 * Argument for {@link editTemplate}. Identifies which template to open and the Mentor language
 * whose grammar (and triplate injection) should apply to the editor.
 */
export type EditTemplateArg =
	| { kind: 'global'; key: string; language: string }
	| { kind: 'scratch'; token: string; content: string; language: string };

/**
 * Opens a template in a real editor tab backed by the `mentor-template` file system, giving it
 * syntax highlighting and triplate code-lenses/execution. Global templates persist to settings on
 * save; scratch templates persist to an in-memory buffer and notify the settings webview.
 *
 * Internal command: invoked from the settings webview's template "Edit" buttons; not contributed
 * to the command palette.
 */
export const editTemplate = {
	id: 'mentor.command.editTemplate',
	handler: async (arg: EditTemplateArg): Promise<void> => {
		const uri = arg.kind === 'scratch'
			? (TemplateFileSystemProvider.seedScratch(arg.token, arg.content), TemplateFileSystemProvider.scratchUri(arg.token, arg.language))
			: TemplateFileSystemProvider.globalUri(arg.key, arg.language);

		const document = await vscode.workspace.openTextDocument(uri);

		// Force the language explicitly so the grammar applies regardless of extension association.
		if (document.languageId !== arg.language) {
			await vscode.languages.setTextDocumentLanguage(document, arg.language);
		}

		await vscode.window.showTextDocument(document, { preview: false });
	}
};
