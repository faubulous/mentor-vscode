import * as vscode from 'vscode';
import { Uri } from '@faubulous/mentor-rdf';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getLocalPartOffset } from '@src/utilities/uri';
import { getConfig } from '@src/utilities/vscode/config';
import { IWorkspaceRenameService } from './workspace-rename-service.interface';

/**
 * Extends the rename of an IRI to every other indexed document that references it.
 *
 * The documents are found through the `references` index of their contexts, the same
 * index that Find Usages uses. Indexed documents that are not open keep no tokens, so
 * the edits are located in the document text: only the local part of each occurrence
 * is replaced, which keeps prefixed names, IRI references and RDF/XML attribute values
 * valid whatever prefix or syntax the document uses.
 */
export class WorkspaceRenameService implements IWorkspaceRenameService {
	constructor(private readonly _contextService: IDocumentContextService) { }

	async addEditsInOtherFiles(edit: vscode.WorkspaceEdit, iri: string, newLocalPart: string, originUri: vscode.Uri): Promise<number> {
		if (!getConfig().get<boolean>('editor.renameAcrossFiles', true)) {
			return 0;
		}

		const localPart = iri.substring(Uri.getNamespaceIri(iri).length);

		if (!localPart) {
			return 0;
		}

		const targets = this._getTargetContexts(iri, originUri);
		const texts = await Promise.all(targets.map(context => this._readText(context.uri)));

		let count = 0;

		targets.forEach((context, index) => {
			const text = texts[index];

			if (text !== undefined) {
				count += this._addEdits(edit, context, iri, localPart, newLocalPart, text);
			}
		});

		return count;
	}

	/**
	 * Returns the contexts of the documents other than the origin that reference the IRI
	 * and can be edited. Temporary contexts, such as Git diff views, are excluded, as they
	 * are in Find Usages.
	 * @param iri The IRI that is renamed.
	 * @param originUri The URI of the document the rename was invoked in.
	 */
	private _getTargetContexts(iri: string, originUri: vscode.Uri): IDocumentContext[] {
		const origin = originUri.toString();

		return Object.values(this._contextService.contexts).filter(context => !context.isTemporary
			&& context.uri.toString() !== origin
			&& vscode.workspace.fs.isWritableFileSystem(context.uri.scheme) !== false
			&& context.references.has(iri));
	}

	/**
	 * Reads the current text of a document: the text of an open document, which includes
	 * unsaved changes, or the file content otherwise. Notebook cells and untitled documents
	 * can only be edited while they are open.
	 * @param uri The URI of the document.
	 * @returns The text, or `undefined` if the document cannot be read.
	 */
	private async _readText(uri: vscode.Uri): Promise<string | undefined> {
		const key = uri.toString();
		const openDocument = vscode.workspace.textDocuments.find(document => document.uri.toString() === key);

		if (openDocument) {
			return openDocument.getText();
		}

		if (uri.scheme === 'vscode-notebook-cell' || uri.scheme === 'untitled') {
			return undefined;
		}

		try {
			return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
		} catch {
			return undefined;
		}
	}

	/**
	 * Adds an edit for every occurrence of the IRI in a document whose text still shows
	 * the local part at the indexed position. Occurrences that do not, e.g. because the
	 * index is stale, are skipped rather than corrupted.
	 * @returns The number of edits that were added.
	 */
	private _addEdits(edit: vscode.WorkspaceEdit, context: IDocumentContext, iri: string, localPart: string, newLocalPart: string, text: string): number {
		const lines = text.split(/\r?\n/);
		const metadata: vscode.WorkspaceEditEntryMetadata = {
			needsConfirmation: true,
			label: 'Rename in other files',
			description: vscode.workspace.asRelativePath(context.uri),
		};
		const editedRanges = new Set<string>();

		for (const range of context.references.getRanges(iri)) {
			const { start, end } = range;
			const rangeKey = `${start.line}:${start.character}:${end.character}`;

			if (start.line !== end.line || editedRanges.has(rangeKey)) {
				continue;
			}

			const line = lines[start.line];
			const offset = line !== undefined ? getLocalPartOffset(line.substring(start.character, end.character), localPart) : undefined;

			if (offset === undefined) {
				continue;
			}

			const character = start.character + offset;

			edit.replace(context.uri, new vscode.Range(start.line, character, start.line, character + localPart.length), newLocalPart, metadata);
			editedRanges.add(rangeKey);
		}

		return editedRanges.size;
	}
}
