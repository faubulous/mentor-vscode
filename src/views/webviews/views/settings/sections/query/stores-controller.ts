import * as vscode from 'vscode';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';

const SECTION_ID: SettingsSectionId = 'query.stores';

type SectionMessage = { section: SettingsSectionId; id: string } & Record<string, unknown>;

/**
 * Section controller for the Query > Stores settings section.
 *
 * Runs the native delete confirmation on the extension host and posts the result back to the
 * webview, which performs the actual settings write to the store's own configuration scope.
 * The store name, scope, and details are edited in the webview's modal editor.
 */
export class StoresSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: unknown) => void = () => { };

	initialize(post: (message: unknown) => void): void {
		this._post = post;
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
		// No resources to release.
	}
}
