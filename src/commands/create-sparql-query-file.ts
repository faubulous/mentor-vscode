import * as vscode from 'vscode';
import { mentor } from '@src/mentor';

export const createSparqlQueryFile = {
	commandId: 'mentor.command.createSparqlQueryFile',
	handler: async () => {
		const content = mentor.configuration.get<string>('query.sparql.defaultQueryTemplate', '');
		const document = await vscode.workspace.openTextDocument({ content, language: 'sparql' });
		
		await vscode.window.showTextDocument(document);
	}
};