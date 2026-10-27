import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { FormEditorProvider } from './form-editor-provider';

/**
 * The file patterns the form editor is contributed for in the manifest.
 */
export const FORM_EDITOR_FILE_PATTERNS = ['*.ttl', '*.trig', '*.nt', '*.nq'];

/**
 * The setting VS Code decides the default editor of a file by.
 */
const ASSOCIATIONS_KEY = 'editorAssociations';

/**
 * The scopes a default view can be set in. The setting is window scoped, so a folder cannot set it.
 */
const TARGETS = [vscode.ConfigurationTarget.Global, vscode.ConfigurationTarget.Workspace];

/**
 * Keeps `workbench.editorAssociations` in step with the configured default view. VS Code decides
 * the editor a file opens in through the associations, and the form editor is contributed with
 * the `option` priority so it never wins without one. With the association in place a document
 * opens in the form editor right away, and a form that is already open is revealed instead of a
 * text editor being opened beside it. The entries of the RDF file patterns are added in the
 * scope the default view is set in while the form editor is enabled and the default, and removed
 * from every scope otherwise; other associations are left alone.
 */
export class FormEditorAssociations implements vscode.Disposable {
	private readonly _subscriptions: vscode.Disposable[] = [];

	/**
	 * Create the service, apply the configured default and follow its changes.
	 */
	constructor() {
		this._subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('mentor.formEditor')) {
				void this.apply();
			}
		}));

		void this.apply();
	}

	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}

		this._subscriptions.length = 0;
	}

	/**
	 * Bring the associations in step with the configured default view.
	 */
	async apply(): Promise<void> {
		const configuration = getConfig('formEditor');
		const formIsDefault = configuration.get<boolean>('enabled', false) && configuration.get<string>('defaultView') === 'form';
		const defaultViewTarget = configuration.inspect<string>('defaultView')?.workspaceValue !== undefined
			? vscode.ConfigurationTarget.Workspace
			: vscode.ConfigurationTarget.Global;

		for (const target of TARGETS) {
			await this._applyTo(target, formIsDefault && target === defaultViewTarget);
		}
	}

	/**
	 * Add the form editor's entries to the associations of a scope, or remove them from it.
	 * @param target The scope.
	 * @param associate Whether the entries belong in the scope.
	 */
	private async _applyTo(target: vscode.ConfigurationTarget, associate: boolean): Promise<void> {
		const configuration = vscode.workspace.getConfiguration('workbench');
		const current = _valueIn(configuration.inspect<Record<string, string>>(ASSOCIATIONS_KEY), target);
		const desired = _withFormEditor(current ?? {}, associate);

		if (_sameAssociations(current ?? {}, desired)) {
			return;
		}

		await configuration.update(ASSOCIATIONS_KEY, Object.keys(desired).length > 0 ? desired : undefined, target);
	}
}

/**
 * The value of a setting in one scope.
 * @param inspected The setting as inspected.
 * @param target The scope.
 * @returns The value, or `undefined` when the scope does not set it.
 */
function _valueIn(inspected: { globalValue?: Record<string, string>; workspaceValue?: Record<string, string> } | undefined, target: vscode.ConfigurationTarget): Record<string, string> | undefined {
	return target === vscode.ConfigurationTarget.Workspace ? inspected?.workspaceValue : inspected?.globalValue;
}

/**
 * The associations with the form editor's entries added or removed. An entry a user pointed at
 * another editor is left alone.
 * @param associations The associations of a scope.
 * @param associate Whether the form editor's entries belong in them.
 * @returns The associations.
 */
function _withFormEditor(associations: Record<string, string>, associate: boolean): Record<string, string> {
	const result = { ...associations };

	for (const pattern of FORM_EDITOR_FILE_PATTERNS) {
		if (associate && result[pattern] === undefined) {
			result[pattern] = FormEditorProvider.viewType;
		} else if (!associate && result[pattern] === FormEditorProvider.viewType) {
			delete result[pattern];
		}
	}

	return result;
}

/**
 * Indicate whether two association maps hold the same entries.
 * @param first The one map.
 * @param second The other map.
 * @returns `true` when they are the same.
 */
function _sameAssociations(first: Record<string, string>, second: Record<string, string>): boolean {
	const keys = Object.keys(first);

	return keys.length === Object.keys(second).length && keys.every(key => first[key] === second[key]);
}
