import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { DocumentContextService } from '@src/services/document/document-context-service';

/**
 * A pair of old and new workspace IRIs for a single rename operation.
 */
export interface IriChange {
	readonly oldIri: string;
	readonly newIri: string;
}

/**
 * Service for updating `workspace:` URI references across all indexed documents when
 * a file, notebook, or notebook cell is renamed or moved.
 *
 * Uses the token-based `references` index on each `DocumentContext` for precise,
 * comment/string-safe edits. All changes for a single operation are collected into
 * one `WorkspaceEdit` so the entire operation is undoable with a single Ctrl+Z.
 */
export class ReferenceUpdateService {
	constructor(private readonly _contextService: DocumentContextService) {}

	/**
	 * Updates all `workspace:` URI references for a set of IRI changes.
	 *
	 * @param changes Map of old workspace IRI → new workspace IRI.
	 * @param origin Optional URI of the file that triggered the rename (its own internal
	 *               edits are never gated behind the confirmation dialog).
	 */
	async batchUpdate(changes: Map<string, string>, origin?: vscode.Uri): Promise<void> {
		if (changes.size === 0) {
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		let internalCount = 0;
		let externalCount = 0;
		let externalFileCount = 0;

		const externalUris = new Set<string>();

		for (const context of Object.values(this._contextService.contexts)) {
			let contextHasEdit = false;

			for (const [oldIri, newIri] of changes) {
				const ranges = context.references[oldIri];

				if (!ranges || ranges.length === 0) {
					continue;
				}

				for (const range of ranges) {
					// Convert vscode-languageserver-types Range to vscode.Range
					const vsRange = new vscode.Range(
						range.start.line,
						range.start.character,
						range.end.line,
						range.end.character
					);

					// The stored range covers only the token image. For an IRIREF token the
					// image is `<the-iri>` — we need to write `<newIri>` including the angle
					// brackets. For a PNAME token the image is `prefix:local` — we write just
					// `newIri` (the caller has already resolved it as a full IRI, so we emit
					// the full `<newIri>` form to keep it unambiguous).
					const document = await this._getTextDocument(context.uri);

					if (!document) {
						continue;
					}

					const tokenText = document.getText(vsRange);
					let replacement: string;

					if (tokenText.startsWith('<') && tokenText.endsWith('>')) {
						replacement = `<${newIri}>`;
					} else {
						// PNAME token — expand to full IRI form since the new IRI may not
						// match any known prefix in this document.
						replacement = `<${newIri}>`;
					}

					edit.replace(context.uri, vsRange, replacement);
					contextHasEdit = true;
				}
			}

			if (contextHasEdit) {
				// A context is "internal" if it belongs to the same physical file as origin,
				// regardless of URI scheme (e.g. vscode-notebook-cell: vs file:).
				const isInternal = origin ? context.uri.path === origin.path : false;

				if (isInternal) {
					internalCount++;
				} else {
					externalCount++;
					externalUris.add(context.uri.toString());
				}
			}
		}

		externalFileCount = externalUris.size;

		if (externalCount === 0) {
			// No external references — apply silently.
			await vscode.workspace.applyEdit(edit);
			return;
		}

		// Show a single confirmation dialog for external references.
		const refWord = externalCount === 1 ? 'reference' : 'references';
		const fileWord = externalFileCount === 1 ? 'file' : 'files';
		const message = `This will update ${externalCount} ${refWord} across ${externalFileCount} ${fileWord}. Apply?`;

		const answer = await vscode.window.showWarningMessage(message, { modal: true }, 'Apply', 'Skip External');

		if (answer === 'Apply') {
			await vscode.workspace.applyEdit(edit);
		} else if (answer === 'Skip External') {
			// Apply only the internal edits (rebuild edit with internal-only changes).
			if (internalCount > 0 && origin) {
				const internalEdit = new vscode.WorkspaceEdit();

				for (const [contextUri, edits] of (edit as any)._edits ?? []) {
					if (contextUri.toString().startsWith(origin.toString().replace(/#.*$/, ''))) {
						for (const e of edits) {
							internalEdit.replace(contextUri, e.range, e.newText);
						}
					}
				}

				await vscode.workspace.applyEdit(internalEdit);
			}
		}
		// 'Cancel' / dismiss — do nothing.
	}

	/**
	 * Computes the set of IRI changes when a file or folder is renamed.
	 *
	 * For a single file rename: one entry, old workspace URI → new workspace URI.
	 * For a notebook rename: one entry per cell, with the notebook path prefix updated.
	 * For a folder rename: one entry per indexed file under the old path.
	 *
	 * @param renames The file rename events from `onDidRenameFiles`.
	 * @returns A map of old IRI → new IRI for all affected resources.
	 */
	buildChangesForRenames(renames: ReadonlyArray<{ readonly oldUri: vscode.Uri; readonly newUri: vscode.Uri }>): Map<string, string> {
		const changes = new Map<string, string>();

		for (const { oldUri, newUri } of renames) {
			const oldWorkspace = WorkspaceUri.toWorkspaceUri(oldUri);
			const newWorkspace = WorkspaceUri.toWorkspaceUri(newUri);

			if (!oldWorkspace || !newWorkspace) {
				continue;
			}

			const oldPrefix = oldWorkspace.toString();
			const newPrefix = newWorkspace.toString();

			// Scan all indexed contexts to find those whose workspace URI starts with the
			// old prefix. This handles single files, notebook cells, and entire folders.
			for (const context of Object.values(this._contextService.contexts)) {
				const contextWorkspace = WorkspaceUri.toWorkspaceUri(context.uri, context.slug);

				if (!contextWorkspace) {
					continue;
				}

				const contextIri = contextWorkspace.toString();

				if (contextIri === oldPrefix || contextIri.startsWith(oldPrefix + '#') || contextIri.startsWith(oldPrefix + '/')) {
					const newIri = newPrefix + contextIri.slice(oldPrefix.length);
					changes.set(contextIri, newIri);
				}
			}

			// Also add the bare file IRI (no fragment) in case it is directly referenced.
			if (!changes.has(oldPrefix)) {
				changes.set(oldPrefix, newPrefix);
			}
		}

		return changes;
	}

	/**
	 * Retrieves the VS Code TextDocument for a given URI, opening it if necessary.
	 * Returns undefined if the document cannot be opened (e.g. binary files).
	 */
	private async _getTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
		try {
			return await vscode.workspace.openTextDocument(uri);
		} catch {
			return undefined;
		}
	}
}
