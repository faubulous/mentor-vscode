import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IViewRouter } from '@src/views/webviews';

export const manageSparqlConnections = {
	id: 'mentor.command.manageSparqlConnections',
	handler: async () => {
		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings', section: 'query.connections' }, vscode.ViewColumn.Active);
	}
};
