import * as vscode from 'vscode';
import { mentor } from '@/mentor';

export async function createSparqlQueryFile() {
	const content = mentor.configuration.get<string>('query.sparql.defaultQueryTemplate', '');
	const document = await vscode.workspace.openTextDocument({ content, language: 'sparql' });

	await vscode.window.showTextDocument(document);
}