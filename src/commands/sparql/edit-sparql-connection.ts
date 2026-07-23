import { container } from 'tsyringe';
import * as vscode from 'vscode';
import { ServiceToken } from '@src/services/tokens';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { IViewRouter } from '@src/views/webviews';

export const editSparqlConnection = {
	id: 'mentor.command.editSparqlConnection',
	handler: async (connection: SparqlConnection) => {
		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings', section: 'query.connections', params: { connection } }, vscode.ViewColumn.Active);
	}
};
