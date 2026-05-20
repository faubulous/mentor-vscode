import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { getConfig } from '@src/utilities/vscode/config';
import { MENTOR_LANGUAGE_IDS } from '@src/services/document/document-factory';
import { SettingsPanelMessages } from './settings-panel-messages';
import { EnumOption, SettingScope, SettingState, SettingsSource } from './settings-types';
import { SettingsSectionController } from './settings-section-controller';
import { SETTINGS_GROUPS, SettingsSectionId } from './sections';
import { createSectionControllers } from './sections/host-controllers';
import { SettingsSectionDescriptor, validateSectionDescriptors } from './settings-section-descriptor';

const ALL_SECTIONS: readonly SettingsSectionDescriptor[] = SETTINGS_GROUPS.flatMap(g => [...g.sections]);

const MENTOR_SETTINGS_KEYS = ALL_SECTIONS.flatMap(s => [...s.keys, ...(s.hiddenKeys ?? [])]);

const VSCODE_SETTING_KEYS = ALL_SECTIONS.flatMap(s => s.vscodeKeys?.map(k => k.key) ?? []);

/**
 * Every configuration bucket the settings panel knows how to read and write.
 * The host iterates this list for both initial reads and `onDidChangeConfiguration`
 * fan-out so new buckets can be added without touching the messaging layer.
 */
const SETTINGS_SOURCES: readonly SettingsSource[] = [
	{ kind: 'mentor' },
	...MENTOR_LANGUAGE_IDS.map(languageId => ({ kind: 'languageEditor', languageId } as const)),
];

interface PackageJsonProperty {
	title?: string;
	description?: string;
	enum?: (string | number | boolean)[];
	properties?: Record<string, { enum?: (string | number | boolean)[] }>;
}

type PackageJsonSchema = { properties: Record<string, PackageJsonProperty> };

export class SettingsPanelController extends WebviewController<SettingsPanelMessages> {
	private readonly _sectionControllers = new Map<SettingsSectionId, SettingsSectionController>();

	private _pendingDeepLink?: { section: SettingsSectionId; params?: Record<string, unknown> };

	constructor() {
		super({
			componentPath: 'settings-panel.js',
			panelId: 'mentorSettingsPanel',
			panelTitle: 'Mentor Settings',
			panelIcon: 'gear',
		});

		if (process.env.NODE_ENV !== 'production') {
			const properties = (vscode.extensions.getExtension('faubulous.mentor')?.packageJSON
				?.contributes?.configuration?.[0] as PackageJsonSchema | undefined)?.properties;

			if (properties) {
				const errors = validateSectionDescriptors(ALL_SECTIONS, properties);
				if (errors.length) {
					console.error('[mentor settings] descriptor validation failed:\n' + errors.join('\n'));
				}
			}
		}

		this.subscribe(
			vscode.workspace.onDidChangeConfiguration((e) => {
				for (const source of SETTINGS_SOURCES) {
					if (e.affectsConfiguration(this._affectsScope(source))) {
						this.postMessage({
							id: 'OnSettingsChanged',
							source,
							settings: this._readSettings(source),
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
	async openSection(section?: SettingsSectionId, params?: Record<string, unknown>, viewColumn?: vscode.ViewColumn): Promise<void> {
		const panelAlreadyOpen = !!this.panel;

		this._pendingDeepLink = section ? { section, params } : undefined;

		await super.show(viewColumn);

		if (panelAlreadyOpen) {
			this._dispatchPendingDeepLink();
		}
	}

	private _dispatchPendingDeepLink(): void {
		if (this._pendingDeepLink) {
			const { section, params } = this._pendingDeepLink;

			this.postMessage({ id: 'NavigateTo', section });

			if (params) {
				this._sectionControllers.get(section)?.onActivate?.(params);
			}

			this._pendingDeepLink = undefined;
		}
	}

	private _getPackageProperties(): Record<string, PackageJsonProperty> {
		return (vscode.extensions.getExtension('faubulous.mentor')?.packageJSON
			?.contributes?.configuration?.[0] as PackageJsonSchema | undefined)?.properties ?? {};
	}

	/**
	 * Reads every setting in the given source's bucket into a uniform
	 * `Record<key, SettingState>` shape. The branch picks:
	 *   - which `getConfiguration(...)` to call,
	 *   - which key list to iterate (mentor vs vscode editor),
	 *   - which `inspect()` fields signal "present at workspace/user scope",
	 *   - whether to pull title/description/enum metadata from package.json.
	 */
	private _readSettings(source: SettingsSource): Record<string, SettingState> {
		if (source.kind === 'mentor') {
			const config = getConfig();
			const schema = this._getPackageProperties();
			const result: Record<string, SettingState> = {};

			for (const key of MENTOR_SETTINGS_KEYS) {
				const inspected = config.inspect(key);

				if (!inspected) {
					continue;
				}

				const def = schema[`mentor.${key}`];

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					scope: inspected.workspaceValue !== undefined ? 'workspace'
						: inspected.globalValue !== undefined ? 'user'
							: 'default',
					title: def?.title ?? key,
					description: def?.description ?? '',
					enumOptions: this._toEnumOptions(def?.enum),
					nestedEnumOptions: this._readNestedEnumOptions(def),
				};
			}

			return result;
		} else {
			const config = vscode.workspace.getConfiguration('editor', { languageId: source.languageId });
			const result: Record<string, SettingState> = {};

			for (const key of VSCODE_SETTING_KEYS) {
				const inspected = config.inspect(key);

				if (!inspected) {
					continue;
				}

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					scope: inspected.workspaceLanguageValue !== undefined ? 'workspace'
						: inspected.globalLanguageValue !== undefined ? 'user'
							: 'default',
					title: key,
					description: '',
				};
			}

			return result;
		}
	}

	/**
	 * Writes a setting in the given source's bucket. For mentor keys this uses
	 * the 3-arg `config.update` form; for language-scoped editor keys it uses
	 * the 4-arg form with `overrideInLanguage=true` so the write lands inside
	 * the `[languageId]` override block rather than overwriting the
	 * language-agnostic value.
	 */
	private async _updateSetting(source: SettingsSource, key: string, value: unknown, scope: SettingScope): Promise<void> {
		if (source.kind === 'mentor') {
			const config = getConfig();

			if (scope === 'default') {
				await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
				await config.update(key, undefined, vscode.ConfigurationTarget.Global);
			} else if (scope === 'workspace') {
				await config.update(key, value, vscode.ConfigurationTarget.Workspace);
			} else {
				await config.update(key, value, vscode.ConfigurationTarget.Global);
			}
		} else {
			const config = vscode.workspace.getConfiguration('editor', { languageId: source.languageId });

			if (scope === 'default') {
				await config.update(key, undefined, vscode.ConfigurationTarget.Workspace, true);
				await config.update(key, undefined, vscode.ConfigurationTarget.Global, true);
			} else if (scope === 'workspace') {
				await config.update(key, value, vscode.ConfigurationTarget.Workspace, true);
			} else {
				await config.update(key, value, vscode.ConfigurationTarget.Global, true);
			}
		}
	}

	protected async onDidReceiveMessage(message: SettingsPanelMessages): Promise<boolean> {
		const sectionId = (message as { section?: SettingsSectionId }).section;

		if (sectionId) {
			const section = this._sectionControllers.get(sectionId);

			if (section) {
				return section.handleMessage(message as { section: SettingsSectionId; id: string } & Record<string, unknown>);
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
				this.postMessage({
					id: 'GetSettingsResult',
					source: message.source,
					settings: this._readSettings(message.source),
				});

				this._dispatchPendingDeepLink();

				return true;
			}
			case 'UpdateSetting': {
				await this._updateSetting(message.source, message.key, message.value, message.scope);

				return true;
			}
			default: {
				return super.onDidReceiveMessage(message);
			}
		}
	}

	/**
	 * Splits a camelCase or PascalCase string into separate words and capitalizes the first letter.
	 * @param value The string to split and capitalize.
	 * @returns A human-friendly label derived from the input string, e.g. "annotatedLabels" -> "Annotated Labels".
	 */
	private _splitLabel(value: string): string {
		// Mirror the previous generator's label split for enum values, 
		// e.g. "AnnotatedLabels" -> "Annotated Labels".
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/^./, c => c.toUpperCase());
	}

	/**
	 * Converts an array of values into an array of `EnumOption` objects, suitable for use in a dropdown or similar UI component.
	 * @param values The array of values to convert.
	 * @returns An array of `EnumOption` objects, or `undefined` if the input array is empty or `undefined`.
	 */
	private _toEnumOptions(values: (string | number | boolean)[] | undefined): EnumOption[] | undefined {
		if (!values?.length) {
			return undefined;
		} else {
			return values.map(v => ({ value: String(v), label: this._splitLabel(String(v)) }));
		}
	}

	/**
	 * Reads nested enum options from a package.json property, converting them into a record of `EnumOption` arrays.
	 * @param prop The package.json property to read.
	 * @returns A record of `EnumOption` arrays, or `undefined` if no nested enum options are found.
	 */
	private _readNestedEnumOptions(prop: PackageJsonProperty | undefined): Record<string, EnumOption[]> | undefined {
		if (!prop?.properties) {
			return undefined;
		}

		const result: Record<string, EnumOption[]> = {};

		for (const [name, nested] of Object.entries(prop.properties)) {
			const opts = this._toEnumOptions(nested.enum);

			if (opts) {
				result[name] = opts;
			}
		}

		return Object.keys(result).length ? result : undefined;
	}

	/**
	 * Indicates if a setting source's keys are affected by a configuration change event. 
	 * For mentor settings this is a simple key prefix check; for language-scoped editor 
	 * settings we check if the `[languageId]` override block was affected.
	 * @param source The settings source to check against the configuration change event.
	 * @returns A string representing the configuration scope to check for changes, or `undefined` if the source is not affected.
	 */
	private _affectsScope(source: SettingsSource): string {
		return source.kind === 'mentor' ? 'mentor' : `[${source.languageId}]`;
	}
}
