import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { getConfig } from '@src/utilities/vscode/config';
import { LanguageId, MENTOR_LANGUAGE_IDS } from '@src/services/document/document-factory';
import { SettingsPanelMessages } from './settings-panel-messages';
import { SettingScope, SettingState } from './settings-types';
import { SettingsNavigationSection, SETTINGS, VSCODE_SETTING_KEYS } from './settings-metadata';
import { SettingsSectionController } from './settings-section-controller';
import { createSectionControllers } from './sections';

type PackageJsonSchema = { properties: Record<string, { title?: string; description?: string }> };

export class SettingsPanelController extends WebviewController<SettingsPanelMessages> {
	private _pendingDeepLink?: { section: SettingsNavigationSection; params?: Record<string, unknown> };
	private readonly _sectionControllers = new Map<SettingsNavigationSection, SettingsSectionController>();

	constructor() {
		super({
			componentPath: 'settings-panel.js',
			panelId: 'mentorSettingsPanel',
			panelTitle: 'Mentor Settings',
			panelIcon: 'gear',
		});

		this.subscribe(
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('mentor')) {
					this.postMessage({ id: 'OnSettingsChanged', settings: this._readAllSettings() });
				}

				for (const languageId of MENTOR_LANGUAGE_IDS) {
					if (e.affectsConfiguration(`[${languageId}]`)) {
						this.postMessage({
							id: 'OnVSCodeSettingsChanged',
							languageId,
							settings: this._readVSCodeSettings(languageId),
						});
					}
				}
			})
		);

		const post = (message: unknown) => this.postMessage(message as SettingsPanelMessages);

		for (const sectionController of createSectionControllers()) {
			this._sectionControllers.set(sectionController.id, sectionController);
			sectionController.initialize(post);
			this.subscribe(sectionController);
		}
	}

	/**
	 * Opens the settings panel, optionally navigating to a specific section and forwarding
	 * a `params` blob to the section's controller for interpretation (e.g. opening the
	 * connection editor for a specific connection).
	 *
	 * If the panel is already open, the deep-link is dispatched immediately. Otherwise it
	 * is stashed and dispatched once the React side has mounted (signaled by `GetSettings`).
	 */
	async openSection(section?: SettingsNavigationSection, params?: Record<string, unknown>, viewColumn?: vscode.ViewColumn): Promise<void> {
		const panelAlreadyOpen = !!this.panel;

		this._pendingDeepLink = section ? { section, params } : undefined;

		await super.show(viewColumn);

		if (panelAlreadyOpen) {
			this._dispatchPendingDeepLink();
		}
	}

	private _dispatchPendingDeepLink(): void {
		if (!this._pendingDeepLink) {
			return;
		}
		const { section, params } = this._pendingDeepLink;
		this.postMessage({ id: 'NavigateTo', section });
		if (params) {
			this._sectionControllers.get(section)?.onActivate?.(params);
		}
		this._pendingDeepLink = undefined;
	}

	private _readAllSettings(): Record<string, SettingState> {
		const config = getConfig();
		const result: Record<string, SettingState> = {};

		const schema = (vscode.extensions.getExtension('faubulous.mentor')?.packageJSON
			?.contributes?.configuration?.[0] as PackageJsonSchema | undefined)?.properties ?? {};

		for (const key of Object.keys(SETTINGS)) {
			const inspected = config.inspect(key);

			if (inspected) {
				const hasWorkspace = inspected.workspaceValue !== undefined;
				const hasUser = inspected.globalValue !== undefined;
				const def = schema[`mentor.${key}`];

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					scope: hasWorkspace ? 'workspace' : hasUser ? 'user' : 'default',
					title: def?.title ?? key,
					description: def?.description ?? '',
				};
			}
		}

		return result;
	}

	private _readVSCodeSettings(languageId: LanguageId): Record<string, SettingState> {
		const config = vscode.workspace.getConfiguration('editor', { languageId });
		const result: Record<string, SettingState> = {};

		for (const key of VSCODE_SETTING_KEYS) {
			const inspected = config.inspect(key);

			if (inspected) {
				const hasLanguageWorkspace = inspected.workspaceLanguageValue !== undefined;
				const hasLanguageUser = inspected.globalLanguageValue !== undefined;

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					scope: hasLanguageWorkspace ? 'workspace' : hasLanguageUser ? 'user' : 'default',
					title: key,
					description: '',
				};
			}
		}

		return result;
	}

	private async _updateSetting(key: string, value: unknown, scope: SettingScope): Promise<void> {
		const config = getConfig();

		if (scope === 'default') {
			await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
			await config.update(key, undefined, vscode.ConfigurationTarget.Global);
		} else if (scope === 'workspace') {
			await config.update(key, value, vscode.ConfigurationTarget.Workspace);
		} else {
			await config.update(key, value, vscode.ConfigurationTarget.Global);
		}
	}

	private async _updateVSCodeSetting(languageId: LanguageId, key: string, value: unknown, scope: SettingScope): Promise<void> {
		const config = vscode.workspace.getConfiguration('editor', { languageId });

		if (scope === 'default') {
			await config.update(key, undefined, vscode.ConfigurationTarget.Workspace, true);
			await config.update(key, undefined, vscode.ConfigurationTarget.Global, true);
		} else if (scope === 'workspace') {
			await config.update(key, value, vscode.ConfigurationTarget.Workspace, true);
		} else {
			await config.update(key, value, vscode.ConfigurationTarget.Global, true);
		}
	}

	protected async onDidReceiveMessage(message: SettingsPanelMessages): Promise<boolean> {
		const sectionId = (message as { section?: SettingsNavigationSection }).section;
		if (sectionId) {
			const section = this._sectionControllers.get(sectionId);
			if (section) {
				return section.handleMessage(message as { section: SettingsNavigationSection; id: string } & Record<string, unknown>);
			}
		}

		switch (message.id) {
			case 'GetVersion': {
				const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
				const version = (context.extension?.packageJSON?.version as string) ?? 'unknown';

				this.postMessage({ id: 'GetVersionResult', version });
				return true;
			}
			case 'GetSettings': {
				this.postMessage({ id: 'GetSettingsResult', settings: this._readAllSettings() });
				this._dispatchPendingDeepLink();
				return true;
			}
			case 'UpdateSetting': {
				await this._updateSetting(message.key, message.value, message.scope);
				return true;
			}
			case 'GetVSCodeSettings': {
				this.postMessage({
					id: 'GetVSCodeSettingsResult',
					languageId: message.languageId,
					settings: this._readVSCodeSettings(message.languageId),
				});
				return true;
			}
			case 'UpdateVSCodeSetting': {
				await this._updateVSCodeSetting(message.languageId, message.key, message.value, message.scope);
				return true;
			}
			default:
				return super.onDidReceiveMessage(message);
		}
	}
}
