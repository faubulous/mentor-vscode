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
import { SettingsScopeContext, SettingsScopeSetContext, SettingsMoveContext } from './components/setting-context';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/webview-hooks';
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
	activeScope: 'user' | 'workspace';
	formattingLanguage: FormattingLanguage;
	version: string;
	searchTerm: string;
	hasWorkspace: boolean;
}

const initialState: SettingsPanelState = {
	settingsBySource: {},
	activeSection: 'appearance.display',
	activeScope: 'user',
	formattingLanguage: 'turtle',
	version: '',
	searchTerm: '',
	hasWorkspace: true,
};

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

	/**
	 * Optimistic local-state patch for an inflight update. Mirrors the previous
	 * `handleUpdate` / `handleVSCodeUpdate` writes against the unified slice.
	 */
	const patchSetting = useCallback((source: SettingsSource, key: string, mut: (prev: SettingState | undefined) => SettingState | undefined) => {
		const sk = settingsSourceKey(source);
		setState(prev => {
			const slice = prev.settingsBySource[sk] ?? {};
			const next = mut(slice[key]);
			if (next === undefined) {
				const { [key]: _, ...rest } = slice;
				return { ...prev, settingsBySource: { ...prev.settingsBySource, [sk]: rest } };
			}
			return {
				...prev,
				settingsBySource: { ...prev.settingsBySource, [sk]: { ...slice, [key]: next } },
			};
		});
	}, [setState]);

	const handleUpdate = useCallback((source: SettingsSource, key: string, value: unknown) => {
		const scope: SettingScope = state.activeScope;
		patchSetting(source, key, prev => prev && ({ ...prev, value, scope }));
		messaging?.postMessage({ id: 'UpdateSetting', source, key, value, scope });
	}, [state.activeScope, messaging, patchSetting]);

	const handleSetScope = useCallback((source: SettingsSource, key: string, newScope: SettingScope, currentValue: unknown) => {
		if (newScope === 'default') {
			patchSetting(source, key, prev => prev && ({ ...prev, scope: newScope }));
		}
		// For copy-to-other-scope, local state is unchanged (current setting stays modified).
		messaging?.postMessage({
			id: 'UpdateSetting',
			source,
			key,
			value: newScope === 'default' ? undefined : currentValue,
			scope: newScope,
		});
	}, [messaging, patchSetting]);

	const handleScopeTabChange = useCallback((scope: 'user' | 'workspace') => {
		setState(prev => ({ ...prev, activeScope: scope }));
	}, [setState]);

	const handleBulkScope = useCallback((source: SettingsSource, keys: string[], scope: 'user' | 'workspace') => {
		const sk = settingsSourceKey(source);
		const slice = state.settingsBySource[sk] ?? {};
		for (const key of keys) {
			handleSetScope(source, key, scope, slice[key]?.value);
		}
	}, [state.settingsBySource, handleSetScope]);

	const handleMoveToScope = useCallback((source: SettingsSource, key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => {
		messaging?.postMessage({ id: 'UpdateSetting', source, key, value, scope: toScope });
		messaging?.postMessage({ id: 'UpdateSetting', source, key, value: undefined, scope: fromScope });
		patchSetting(source, key, prev => prev && ({
			...prev,
			scope: 'default',
			value: prev.defaultValue,
		}));
	}, [messaging, patchSetting]);

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
		activeScope: state.activeScope,
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
		<SettingsScopeContext.Provider value={state.activeScope}>
			<SettingsScopeSetContext.Provider value={handleScopeTabChange}>
			<SettingsMoveContext.Provider value={handleMoveToScope}>
				<div className="settings-panel">
					<SettingsPanelHeader
						version={state.version}
						activeScope={state.activeScope}
						onScopeTabChange={handleScopeTabChange}
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
			</SettingsMoveContext.Provider>
			</SettingsScopeSetContext.Provider>
		</SettingsScopeContext.Provider>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
