import * as vscode from 'vscode';
import { mentor } from '../mentor';

export async function deletePrefixes(documentUri: vscode.Uri, prefixes: string[]) {
	const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

	if (document) {
		const edit = await mentor.prefixDeclarationService.deletePrefixes(document, prefixes);

		if (edit.size > 0) {
			await vscode.workspace.applyEdit(edit);
		}
	}
}