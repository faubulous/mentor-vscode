import { useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeSettings } from './settings-types';
import { SettingsSectionId, SETTINGS_GROUPS } from './sections';
import { SettingsSectionDescriptor } from './settings-section-descriptor';
import { SettingsPanelHeader } from './components/settings-panel-header';
import { SearchResults } from './components/settings-search-results';
import { SettingsNavigation } from './components/settings-navigation';
import { MENTOR_LANGUAGE_IDS, FormattingLanguage } from '@src/services/document/document-languages';
import { MENTOR_SOURCE, SettingScope, SettingState, SettingsSource, settingsSourceKey } from './settings-types';
import { SettingsPanelMessages } from './settings-panel-messages';
import { SettingsScopeTargetApi, SettingsScopeTargetContext, SettingsWorkspaceContext } from './components/setting-context';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/webview-hooks';
import { patchNestedRecord } from '@src/views/webviews/webview-utils';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import stylesheet from './settings-panel.css';

const SECTIONS_BY_ID = Object.fromEntries(
	SETTINGS_GROUPS.flatMap(g => g.sections.map(s => [s.id, s as SettingsSectionDescriptor])),
) as Record<SettingsSectionId, SettingsSectionDescriptor>;

/**
 * Every settings bucket the panel knows about, kept in sync with the host
 * controller's `SETTINGS_SOURCES`. Mentor settings + one language-editor
 * source per Mentor language.
 */
const SETTINGS_SOURCES: SettingsSource[] = [
	MENTOR_SOURCE,
	...MENTOR_LANGUAGE_IDS.map(languageId => ({ kind: 'languageEditor', languageId } as const)),
];

interface SettingsPanelState {
	settingsBySource: Record<string, Record<string, SettingState>>;
	activeSection: SettingsSectionId;
	/**
	 * Per-key target scope, keyed by `${settingsSourceKey(source)}::${key}`. Holds an explicit
	 * override of where a setting's next write should land; when absent the target falls back to
	 * the setting's current scope (or `'user'` when unset).
	 */
	scopeByKey: Record<string, 'user' | 'workspace'>;
	formattingLanguage: FormattingLanguage;
	version: string;
	searchTerm: string;
	hasWorkspace: boolean;
}

const initialState: SettingsPanelState = {
	settingsBySource: {},
	activeSection: 'appearance.display',
	scopeByKey: {},
	formattingLanguage: 'turtle',
	version: '',
	searchTerm: '',
	hasWorkspace: true,
};

/** Stable map key combining a settings source and a setting key. */
function scopeKeyOf(source: SettingsSource, key: string): string {
	return `${settingsSourceKey(source)}::${key}`;
}

function SettingsPanel() {
	const [state, setState] = useWebviewState<SettingsPanelState>(initialState);

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

	useEffect(() => {
		for (const source of SETTINGS_SOURCES) {
			messaging?.postMessage({ id: 'GetSettings', source });
		}
		messaging?.postMessage({ id: 'GetVersion' });
		messaging?.postMessage({ id: 'GetWorkspaceState' });
	}, []);

	const mentorSettings = state.settingsBySource[settingsSourceKey(MENTOR_SOURCE)] ?? {};

	const vscodeSettings: VSCodeSettings = useMemo(
		() => MENTOR_LANGUAGE_IDS.reduce((acc, languageId) => {
			acc[languageId] = state.settingsBySource[settingsSourceKey({ kind: 'languageEditor', languageId })] ?? {};
			return acc;
		}, {} as VSCodeSettings),
		[state.settingsBySource],
	);

	const handleUpdate = useCallback((source: SettingsSource, key: string, value: unknown) => {
		const existing = state.settingsBySource[settingsSourceKey(source)]?.[key];
		const fallback: 'user' | 'workspace' = existing?.scope === 'workspace' ? 'workspace' : 'user';
		const scope: SettingScope = state.scopeByKey[scopeKeyOf(source, key)] ?? fallback;

		setState(prev => ({
			...prev,
			settingsBySource: patchNestedRecord(prev.settingsBySource, settingsSourceKey(source), key, prev2 => prev2 && ({ ...prev2, value, scope })),
		}));

		messaging?.postMessage({ id: 'UpdateSetting', source, key, value, scope });
	}, [state.scopeByKey, state.settingsBySource, messaging, setState]);

	const handleSetScope = useCallback((source: SettingsSource, key: string, newScope: SettingScope, currentValue: unknown) => {
		if (newScope === 'default') {
			setState(prev => ({
				...prev,
				settingsBySource: patchNestedRecord(prev.settingsBySource, settingsSourceKey(source), key, prev2 => prev2 && ({ ...prev2, scope: 'default', value: prev2.defaultValue })),
			}));
		}

		// For copy-to-other-scope, local state is unchanged (current setting stays modified).
		messaging?.postMessage({
			id: 'UpdateSetting',
			source,
			key,
			value: newScope === 'default' ? undefined : currentValue,
			scope: newScope,
		});
	}, [messaging, setState]);

	const handleBulkScope = useCallback((source: SettingsSource, keys: string[], scope: 'user' | 'workspace') => {
		const sourceKey = settingsSourceKey(source);
		const slice = state.settingsBySource[sourceKey] ?? {};

		for (const key of keys) {
			handleSetScope(source, key, scope, slice[key]?.value);
		}
	}, [state.settingsBySource, handleSetScope]);

	/**
	 * Picks a new target scope for a single setting. Records the choice in `scopeByKey`,
	 * and when the setting already holds a non-default value in a different scope, moves it
	 * (write the new scope, clear the old) so it lands in its new home.
	 */
	const handleSelectScope = useCallback((source: SettingsSource, key: string, newScope: 'user' | 'workspace', st: SettingState | undefined) => {
		setState(prev => ({ ...prev, scopeByKey: { ...prev.scopeByKey, [scopeKeyOf(source, key)]: newScope } }));

		const settingScope = st?.scope ?? 'default';

		if (settingScope !== 'default' && settingScope !== newScope) {
			messaging?.postMessage({ id: 'UpdateSetting', source, key, value: st?.value, scope: newScope });
			messaging?.postMessage({ id: 'UpdateSetting', source, key, value: undefined, scope: settingScope });
			setState(prev => ({
				...prev,
				settingsBySource: patchNestedRecord(prev.settingsBySource, settingsSourceKey(source), key, prev2 => prev2 && ({ ...prev2, scope: newScope })),
			}));
		}
	}, [messaging, setState]);

	const scopeTarget = useMemo<SettingsScopeTargetApi>(() => ({
		get: (source, key, st) => state.scopeByKey[scopeKeyOf(source, key)] ?? (st?.scope === 'workspace' ? 'workspace' : 'user'),
		select: handleSelectScope,
	}), [state.scopeByKey, handleSelectScope]);

	const handleNavSelect = useCallback((section: SettingsSectionId) => {
		setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }));
		if (section === 'editor.formatting') {
			messaging?.postMessage({
				id: 'GetSettings',
				source: { kind: 'languageEditor', languageId: state.formattingLanguage },
			});
		}
	}, [state.formattingLanguage, messaging, setState]);

	const handleFormattingLanguageChange = useCallback((lang: FormattingLanguage) => {
		setState(prev => ({ ...prev, formattingLanguage: lang }));
		messaging?.postMessage({
			id: 'GetSettings',
			source: { kind: 'languageEditor', languageId: lang },
		});
	}, [messaging, setState]);

	const handleSearchChange = useCallback((term: string) => {
		setState(prev => ({ ...prev, searchTerm: term }));
	}, [setState]);

	const commonProps = {
		settings: mentorSettings,
		onUpdate: handleUpdate,
		setScope: handleSetScope,
		onBulkScope: handleBulkScope,
	};

	const renderSection = () => {
		if (state.searchTerm.trim()) {
			return (
				<SearchResults
					searchTerm={state.searchTerm}
					settings={mentorSettings}
					onNavigate={section => setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }))}
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
				{...commonProps}
				keys={descriptor.keys}
				vscodeSettings={vscodeSettings}
				formattingLanguage={state.formattingLanguage}
				onFormattingLanguageChange={handleFormattingLanguageChange}
			/>
		);
	};

	return (
		<SettingsWorkspaceContext.Provider value={state.hasWorkspace}>
			<SettingsScopeTargetContext.Provider value={scopeTarget}>
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
								{renderSection()}
							</div>
						</div>
					</div>
				</div>
			</SettingsScopeTargetContext.Provider>
		</SettingsWorkspaceContext.Provider>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
