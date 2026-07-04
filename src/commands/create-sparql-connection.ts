import { container } from 'tsyringe';
import * as vscode from 'vscode';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { IViewRouter } from '@src/views/webviews';

export const createSparqlConnection = {
	id: 'mentor.command.createSparqlConnection',
	handler: async () => {
		const service = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const connection = await service.createConnection();

		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings', section: 'query.connections', params: { connection } }, vscode.ViewColumn.Active);
	}
};
