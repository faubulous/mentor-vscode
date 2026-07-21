import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { TemplateFileSystemProvider } from '@src/providers/template-file-system-provider';
import { ISparqlConnectionRegistry } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { confirmSettingsItemDeletion } from '../../confirm-settings-item-deletion';
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

				const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);

				// Connections that reference this store type would otherwise be silently orphaned.
				// Protected connections (the workspace store) cannot be updated or deleted.
				const affected = connectionRegistry.getConnections().filter(c => c.storeType === profileId && !c.isProtected);

				if (affected.length === 0) {
					await confirmSettingsItemDeletion(this._post, {
						message: `Are you sure you want to delete the store "${label}"?`,
						deletedMessage: { section: SECTION_ID, id: 'StoreProfileDeleted', profileId },
					});

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
							await connectionRegistry.updateConnection({ ...connection, storeType: defaultStoreType, isModified: true });
						}

						await connectionRegistry.saveConfiguration();
					} else if (choice === 'Delete Connections') {
						for (const connection of affected) {
							await connectionRegistry.deleteConnection(connection.id);
						}

						await connectionRegistry.saveConfiguration();
					} else {
						// Cancelled — leave both the store and its connections untouched.
						return true;
					}

					this._post({ section: SECTION_ID, id: 'StoreProfileDeleted', profileId });

					return true;
				}
			}
			case 'StoreScopeChanged': {
				// A store moved between the user and workspace scopes. Connections may
				// only use preset or same-scope stores, so connections in the old scope
				// that reference this store are now scope-incompatible — name them in a
				// non-blocking warning; the connections list badges the persistent state.
				const { storeId, label, newScope } = message;
				
				const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
				const affected = connectionRegistry.getConnections().filter(c =>
					c.storeType === storeId
					&& !c.isProtected
					&& (c.configScope === ConfigurationScope.Workspace ? 'workspace' : 'user') !== newScope);

				if (affected.length > 0) {
					const noun = affected.length === 1 ? 'connection' : 'connections';

					vscode.window.showWarningMessage(
						`The store "${label}" was moved to the ${newScope} settings, but ${affected.length} ${noun} in the other scope still use${affected.length === 1 ? 's' : ''} it: `
						+ affected.map(c => c.endpointUrl).join(', ')
						+ '. Those connections now reference a store outside their own scope and fall back to generic SPARQL defaults wherever the store is missing.'
					);
				}

				return true;
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
