import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsNavigationSection } from './settings/settings-metadata';
import { SettingsPanelController } from './settings/settings-panel-controller';
import { SparqlConnectionsListController } from './sparql-connections-list/sparql-connections-list-controller';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

/**
 * A view target identifies a destination the user can be navigated to.
 * Adding a new view type means extending this union and handling it in {@link ViewRouter}.
 */
export type ViewTarget =
	| { kind: 'settings'; section?: SettingsNavigationSection; params?: { connection?: SparqlConnection } }
	| { kind: 'connectionsList' };

/**
 * Generic navigation API between webview panels. Commands and other code should depend on
 * {@link IViewRouter} rather than resolving concrete controllers, so the wiring between a
 * "view target" and the controller that hosts it lives in exactly one place.
 */
export interface IViewRouter {
	open(target: ViewTarget, viewColumn?: vscode.ViewColumn): Promise<void>;
}

export class ViewRouter implements IViewRouter {
	async open(target: ViewTarget, viewColumn?: vscode.ViewColumn): Promise<void> {
		switch (target.kind) {
			case 'settings': {
				const controller = container.resolve<SettingsPanelController>(ServiceToken.SettingsPanelController);
				const params = target.params?.connection ? { connection: target.params.connection } : undefined;
				await controller.openSection(target.section, params, viewColumn);
				return;
			}
			case 'connectionsList': {
				const controller = container.resolve<SparqlConnectionsListController>(ServiceToken.SparqlConnectionsListController);
				await controller.open();
				return;
			}
		}
	}
}
