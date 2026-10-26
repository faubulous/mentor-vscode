import * as vscode from 'vscode';

/**
 * Interface for the service that extends the rename of an IRI to every other
 * indexed document that references it.
 */
export interface IWorkspaceRenameService {
	/**
	 * Adds edits that rename the local part of an IRI in all indexed documents other
	 * than the one the rename was invoked in. The edits are marked as needing
	 * confirmation, so they are shown in the Refactor Preview before they are applied.
	 * Does nothing when the `mentor.editor.renameAcrossFiles` setting is disabled.
	 * @param edit The workspace edit of the rename, which receives the additional edits.
	 * @param iri The IRI that is renamed.
	 * @param newLocalPart The new local part of the IRI.
	 * @param originUri The URI of the document the rename was invoked in.
	 * @returns The number of edits that were added.
	 */
	addEditsInOtherFiles(edit: vscode.WorkspaceEdit, iri: string, newLocalPart: string, originUri: vscode.Uri): Promise<number>;
}
