import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { TemplateFileSystemProvider } from '@src/providers/template-file-system-provider';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { SettingsSectionId } from '..';

const SECTION_ID = 'query.stores' satisfies SettingsSectionId;

/**
 * Section controller for the Query > Stores settings section.
 *
 * Runs the native delete confirmation on the extension host and posts the result back to the
 * webview, which performs the actual settings write to the store's own configuration scope.
 * The store name, scope, and details are edited in the webview's modal editor.
 *
 * Also relays per-store query-template editor saves back to the webview: the template "Edit"
 * button opens a scratch-backed editor and the webview folds the saved content into its draft.
 */
export class StoresSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: SettingsSectionMessages) => void = () => { };

	private _scratchSaveSubscription?: vscode.Disposable;

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		// Store query-template overrides live only in the webview draft; forward scratch saves so
		// the open store editor can apply them. Only stores use the scratch backing today.
		this._scratchSaveSubscription = TemplateFileSystemProvider.onDidSaveScratch(({ token, content }) => {
			this._post({ section: SECTION_ID, id: 'StoreQueryTemplateSaved', token, content });
		});
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		switch (message.id) {
			case 'DeleteStoreProfile': {
				const profileId = message.profileId;
				const label = message.label;

				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

				// Connections that reference this store type would otherwise be silently orphaned.
				const affected = connectionService.getConnections().filter(c => c.storeType === profileId);

				if (affected.length === 0) {
					const answer = await vscode.window.showWarningMessage(
						`Are you sure you want to delete the store "${label}"?`,
						{ modal: true },
						'Delete'
					);

					if (answer === 'Delete') {
						this._post({ section: SECTION_ID, id: 'StoreProfileDeleted', profileId });
					}

					return true;
				} else {

					const count = affected.length;
					const noun = count === 1 ? 'connection' : 'connections';

					const choice = await vscode.window.showWarningMessage(
						`The store "${label}" is used by ${count} ${noun}.`,
						{
							modal: true,
							detail: `If you proceed the following ${noun} will use the standard SPARQL endpoint:\n\n`
								+ affected.map(c => `• ${c.endpointUrl}`).join('\n'),
						},
						'OK',
						'Delete Connections'
					);

					if (choice === 'OK') {
						const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
						const defaultStoreType = storeConfigService.defaultStoreType;

						for (const connection of affected) {
							await connectionService.updateConnection({ ...connection, storeType: defaultStoreType, isModified: true });
						}

						await connectionService.saveConfiguration();
					} else if (choice === 'Delete Connections') {
						for (const connection of affected) {
							await connectionService.deleteConnection(connection.id);
						}

						await connectionService.saveConfiguration();
					} else {
						// Cancelled — leave both the store and its connections untouched.
						return true;
					}

					this._post({ section: SECTION_ID, id: 'StoreProfileDeleted', profileId });

					return true;
				}
			}
			case 'OpenInBrowser': {
				await vscode.env.openExternal(vscode.Uri.parse(message.url));

				return true;
			}
			default: {
				return false;
			}
		}
	}

	dispose(): void {
		this._scratchSaveSubscription?.dispose();
	}
}
