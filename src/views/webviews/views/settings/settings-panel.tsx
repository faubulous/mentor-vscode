import { useCallback, useEffect, useMemo } from 'react';
import { ScopeKey } from '@src/utilities/config-scope';
import { createRoot } from 'react-dom/client';
import { SettingsSectionId, SETTINGS_GROUPS, defaultScopeForKey } from './sections';
import { SettingsSectionDescriptor } from './settings-section-descriptor';
import { SettingsPanelHeader } from './components/settings-panel-header';
import { SearchResults } from './components/settings-search-results';
import { SettingsNavigation } from './components/settings-navigation';
import { RDF_LANGUAGE_IDS } from '@src/services/document/document-languages';
import {
	MENTOR_SETTINGS_SOURCE,
	SettingScope,
	SettingState,
	SettingsSource,
	VSCodeSettings,
	settingsSourceKey,
} from './settings-types';
import { SettingsPanelMessages } from './settings-panel-messages';
import { SettingsExecuteCommandContext, SettingsScopeTargetApi, SettingsScopeTargetContext, SettingsWorkspaceContext } from './components/setting-context';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/hooks';
import { patchNestedRecord } from '@src/views/webviews/webview-utils';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import stylesheet from './settings-panel.css';

/**
 * Section descriptors indexed by id, for `O(1)` lookup of the active section.
 */
const SECTIONS_BY_ID = Object.fromEntries(
	SETTINGS_GROUPS.flatMap(g => g.sections.map(s => [s.id, s as SettingsSectionDescriptor])),
) as Record<SettingsSectionId, SettingsSectionDescriptor>;

/**
 * Every settings bucket the panel loads, kept in sync with the host controller's
 * `SETTINGS_SOURCES`: the Mentor settings plus one language-editor source per Mentor language.
 */
const SETTINGS_SOURCES: SettingsSource[] = [
	MENTOR_SETTINGS_SOURCE,
	...RDF_LANGUAGE_IDS.map(languageId => ({ kind: 'languageEditor', languageId } as const)),
];

/**
 * Persisted UI state of the settings panel.
 */
interface SettingsPanelState {
	/**
	 * Loaded setting values, keyed by `settingsSourceKey(source)` then by setting key.
	 */
	settingsBySource: Record<string, Record<string, SettingState>>;

	/**
	 * The section currently shown in the content area.
	 */
	activeSection: SettingsSectionId;

	/**
	 * Explicit per-key overrides of where a setting's next write should land, keyed by
	 * {@link scopeKeyOf}. When a key is absent the target falls back to the setting's
	 * current scope (or `'user'` when unset).
	 */
	scopeByKey: Record<string, ScopeKey>;

	/**
	 * Extension version, shown in the header.
	 */
	version: string;

	/**
	 * Human-readable language display names, keyed by language id. Sourced from
	 * package.json's `contributes.languages` aliases via the host.
	 */
	languageLabels: Record<string, string>;

	/**
	 * Current search query; when non-empty the panel shows search results instead of a section.
	 */
	searchTerm: string;

	/**
	 * Whether a workspace folder is open. When `false`, Workspace-scoped writes are disabled.
	 */
	hasWorkspace: boolean;
}

const initialState: SettingsPanelState = {
	settingsBySource: {},
	activeSection: 'appearance.display',
	scopeByKey: {},
	version: '',
	languageLabels: {},
	searchTerm: '',
	hasWorkspace: true,
};

function SettingsPanel() {
	const [state, setState] = useWebviewState<SettingsPanelState>(initialState);

	// --- MESSAGING

	const handleMessage = useCallback((message: SettingsPanelMessages) => {
		switch (message.id) {
			case 'GetSettingsResult':
			case 'OnSettingsChanged':
				setState(prev => ({
					...prev,
					settingsBySource: {
						...prev.settingsBySource,
						[settingsSourceKey(message.source)]: message.settings,
					},
				}));
				return;
			case 'GetVersionResult':
				setState(prev => ({ ...prev, version: message.version }));
				return;
			case 'GetLanguageLabelsResult':
				setState(prev => ({ ...prev, languageLabels: message.labels }));
				return;
			case 'WorkspaceStateChanged':
				setState(prev => ({ ...prev, hasWorkspace: message.hasWorkspace }));
				return;
			case 'NavigateTo':
				setState(prev => ({ ...prev, activeSection: message.section as SettingsSectionId }));
				return;
		}
	}, [setState]);

	const messaging = useWebviewMessaging<SettingsPanelMessages>(handleMessage);

	useSharedStylesheets();
	useStylesheet('settings-panel-styles', stylesheet);

	// Request every bucket of settings, plus version and workspace state, on mount.
	useEffect(() => {
		for (const source of SETTINGS_SOURCES) {
			messaging?.postMessage({ id: 'GetSettings', source });
		}
		messaging?.postMessage({ id: 'GetVersion' });
		messaging?.postMessage({ id: 'GetLanguageLabels' });
		messaging?.postMessage({ id: 'GetWorkspaceState' });
	}, []);

	// --- SETTINGS STATE

	const mentorSettings = state.settingsBySource[settingsSourceKey(MENTOR_SETTINGS_SOURCE)] ?? {};

	const vscodeSettings: VSCodeSettings = useMemo(
		() => RDF_LANGUAGE_IDS.reduce((acc, languageId) => {
			acc[languageId] = state.settingsBySource[settingsSourceKey({ kind: 'languageEditor', languageId })] ?? {};
			return acc;
		}, {} as VSCodeSettings),
		[state.settingsBySource],
	);

	// --- SETTINGS SCOPE RESOLUTION

	/**
	 * Stable map key combining a settings source and a setting key.
	 */
	const scopeKeyOf = (source: SettingsSource, key: string): string => {
		return `${settingsSourceKey(source)}::${key}`;
	};

	/**
	 * {@link defaultScopeForKey}, downgraded to `'user'` when no workspace folder is open
	 * (a Workspace write would otherwise be invalid).
	 */
	const resolveDefaultScope = useCallback((source: SettingsSource, key: string): ScopeKey => {
		const scope = defaultScopeForKey(source, key);
		return scope === 'workspace' && !state.hasWorkspace ? 'user' : scope;
	}, [state.hasWorkspace]);

	/**
	 * The scope a setting's next write targets: an explicit {@link scopeByKey} choice if
	 * present, otherwise the scope it currently lives in, otherwise its default scope.
	 */
	const resolveTargetScope = useCallback((source: SettingsSource, key: string, st: SettingState | undefined): ScopeKey => {
		const explicitChoice = state.scopeByKey[scopeKeyOf(source, key)];

		if (explicitChoice) {
			return explicitChoice;
		}

		if (st?.scope === 'user' || st?.scope === 'workspace') {
			return st.scope;
		}

		return resolveDefaultScope(source, key);
	}, [state.scopeByKey, resolveDefaultScope]);

	// --- SETTINGS MODIFICATION

	/**
	 * Applies `patch` to a single setting's local state, leaving the rest untouched.
	 */
	const patchSetting = useCallback((source: SettingsSource, key: string, patch: (st: SettingState) => SettingState) => {
		setState(prev => ({
			...prev,
			settingsBySource: patchNestedRecord(prev.settingsBySource, settingsSourceKey(source), key, st => st && patch(st)),
		}));
	}, [setState]);

	/**
	 * Writes a new value for a setting, targeting the scope resolved by {@link resolveTargetScope}.
	 */
	const handleUpdate = useCallback((source: SettingsSource, key: string, value: unknown) => {
		const existing = state.settingsBySource[settingsSourceKey(source)]?.[key];
		const scope: SettingScope = resolveTargetScope(source, key, existing);

		patchSetting(source, key, st => ({ ...st, value, scope }));

		messaging?.postMessage({ id: 'UpdateSetting', source, key, value, scope });
	}, [state.settingsBySource, resolveTargetScope, patchSetting, messaging]);

	/**
	 * Resets a setting to its default (`newScope === 'default'`), or copies its current value
	 * into another scope. Reset also clears the local value; a copy leaves local state as-is
	 * because the currently-edited scope stays modified.
	 */
	const handleSetScope = useCallback((source: SettingsSource, key: string, newScope: SettingScope, currentValue: unknown) => {
		if (newScope === 'default') {
			patchSetting(source, key, st => ({ ...st, scope: 'default', value: st.defaultValue }));
		}

		messaging?.postMessage({
			id: 'UpdateSetting',
			source,
			key,
			value: newScope === 'default' ? undefined : currentValue,
			scope: newScope,
		});
	}, [messaging, patchSetting]);

	/**
	 * Applies {@link handleSetScope} to many keys of one source at once.
	 */
	const handleBulkScope = useCallback((source: SettingsSource, keys: string[], scope: ScopeKey) => {
		const slice = state.settingsBySource[settingsSourceKey(source)] ?? {};

		for (const key of keys) {
			handleSetScope(source, key, scope, slice[key]?.value);
		}
	}, [state.settingsBySource, handleSetScope]);

	/**
	 * Picks a new target scope for a single setting. Records the choice in `scopeByKey`, and
	 * when the setting already holds a non-default value in a different scope, moves it there
	 * (writes the new scope, clears the old) so it lands in its new home.
	 */
	const handleSelectScope = useCallback((source: SettingsSource, key: string, newScope: ScopeKey, st: SettingState | undefined) => {
		setState(prev => ({ ...prev, scopeByKey: { ...prev.scopeByKey, [scopeKeyOf(source, key)]: newScope } }));

		const settingScope = st?.scope ?? 'default';
		const movesScope = settingScope !== 'default' && settingScope !== newScope;

		if (movesScope) {
			messaging?.postMessage({ id: 'UpdateSetting', source, key, value: st?.value, scope: newScope });
			messaging?.postMessage({ id: 'UpdateSetting', source, key, value: undefined, scope: settingScope });

			patchSetting(source, key, prev => ({ ...prev, scope: newScope }));
		}
	}, [messaging, setState, patchSetting]);

	const scopeTarget = useMemo<SettingsScopeTargetApi>(() => ({
		get: resolveTargetScope,
		select: handleSelectScope,
	}), [resolveTargetScope, handleSelectScope]);

	/**
	 * Executes a VS Code command on the host, e.g. to open the native settings UI.
	 */
	const executeCommand = useCallback((command: string, ...args: unknown[]) => {
		messaging?.postMessage({ id: 'ExecuteCommand', command, args });
	}, [messaging]);

	// --- EVENT HANDLERS

	/**
	 * Jumps to a section and clears any active search query.
	 */
	const handleNavSelect = useCallback((section: SettingsSectionId) => {
		setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }));
	}, [setState]);

	/**
	 * Updates the search query, which triggers a re-render to show search results instead of a section.
	 */
	const handleSearchChange = useCallback((term: string) => {
		setState(prev => ({ ...prev, searchTerm: term }));
	}, [setState]);

	// --- RENDERING

	/**
	 * Shows search results while a query is active, otherwise the active section's component.
	 */
	const renderContent = () => {
		if (state.searchTerm.trim()) {
			return (
				<SearchResults
					searchTerm={state.searchTerm}
					settings={mentorSettings}
					onNavigate={handleNavSelect}
				/>
			);
		}

		const descriptor = SECTIONS_BY_ID[state.activeSection];

		if (!descriptor) {
			return null;
		}

		const SectionComponent = descriptor.component;

		return (
			<SectionComponent
				settings={mentorSettings}
				onUpdate={handleUpdate}
				setScope={handleSetScope}
				onBulkScope={handleBulkScope}
				keys={descriptor.keys}
				vscodeSettings={vscodeSettings}
				languageLabels={state.languageLabels}
			/>
		);
	};

	return (
		<SettingsWorkspaceContext.Provider value={state.hasWorkspace}>
			<SettingsScopeTargetContext.Provider value={scopeTarget}>
			<SettingsExecuteCommandContext.Provider value={executeCommand}>
				<div className="settings-panel">
					<SettingsPanelHeader
						version={state.version}
						searchTerm={state.searchTerm}
						onSearchChange={handleSearchChange}
						onOpenHomepage={() => messaging?.postMessage({ id: 'ExecuteCommand', command: 'mentor.command.openMentorHomepage' })}
					/>

					{!state.hasWorkspace && (
						<div className="panel-status-banner" role="status">
							<vscode-icon name="warning" />
							<span>
								No workspace is open. Workspace-scoped settings cannot be saved until a workspace folder is opened.
							</span>
						</div>
					)}

					<div className="settings-body">
						<SettingsNavigation activeSection={state.activeSection} onSelect={handleNavSelect} />
						<div className="settings-content">
							<div className="settings-content-inner">
								{renderContent()}
							</div>
						</div>
					</div>
				</div>
			</SettingsExecuteCommandContext.Provider>
			</SettingsScopeTargetContext.Provider>
		</SettingsWorkspaceContext.Provider>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
