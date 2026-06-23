import * as vscode from 'vscode';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { TemplateFileSystemProvider } from '@src/providers/template-file-system-provider';

const SECTION_ID: SettingsSectionId = 'query.stores';

type SectionMessage = { section: SettingsSectionId; id: string } & Record<string, unknown>;

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

	private _post: (message: unknown) => void = () => { };

	private _scratchSaveSubscription?: vscode.Disposable;

	initialize(post: (message: unknown) => void): void {
		this._post = post;

		// Store query-template overrides live only in the webview draft; forward scratch saves so
		// the open store editor can apply them. Only stores use the scratch backing today.
		this._scratchSaveSubscription = TemplateFileSystemProvider.onDidSaveScratch(({ token, content }) => {
			this._post({ section: SECTION_ID, id: 'StoreQueryTemplateSaved', token, content });
		});
	}

	async handleMessage(message: SectionMessage): Promise<boolean> {
		switch (message.id) {
			case 'DeleteStoreProfile': {
				const answer = await vscode.window.showWarningMessage(
					`Are you sure you want to delete the store "${message.label}"?`,
					{ modal: true },
					'Delete'
				);

				if (answer === 'Delete') {
					this._post({ section: SECTION_ID, id: 'StoreProfileDeleted', profileId: message.profileId });
				}

				return true;
			}
			case 'OpenInBrowser': {
				await vscode.env.openExternal(vscode.Uri.parse(message.url as string));

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
