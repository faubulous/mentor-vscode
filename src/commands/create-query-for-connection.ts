import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { getConfig } from '@src/utilities/vscode/config';

/**
 * Creates a new untitled SPARQL query document from the default template and
 * binds the given connection as its query source, so executing the query runs
 * against that endpoint. Invoked from the connections list on the SPARQL
 * results welcome view.
 */
export const createQueryForConnection = {
	id: 'mentor.command.createQueryForConnection',
	handler: async (connectionId: string) => {
		const content = getConfig().get<string>('language.sparql.defaultDocumentTemplate', '');
		const document = await vscode.workspace.openTextDocument({ content, language: 'sparql' });

		await vscode.window.showTextDocument(document);

		const connectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		await connectionService.setQuerySourceForDocument(document.uri, connectionId);
	}
};
