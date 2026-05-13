import { useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeSettings } from './components/types';
import { SettingsNavigationSection } from './settings-metadata';
import { SettingsPanelHeader } from './components/settings-panel-header';
import { SearchResults } from './components/settings-search-results';
import { SettingsNavigation } from './components/settings-navigation';
import { LanguageId, FormattingLanguage } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from './settings-types';
import { SettingsPanelMessages } from './settings-panel-messages';
import { SettingsScopeContext, SettingsMoveContext, VSCodeSettingsMoveContext } from './components/setting-context';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/webview-hooks';
import { SECTION_REGISTRY } from './settings-registry';
import stylesheet from './settings-panel.css';

// ── State ──────────────────────────────────────────────────────

const initialVSCodeSettings: VSCodeSettings = {
	turtle: {},
	sparql: {},
	trig: {},
	n3: {},
	ntriples: {},
	nquads: {},
};

interface SettingsPanelState {
	settings: Record<string, SettingState>;
	vscodeSettings: VSCodeSettings;
	activeSection: SettingsNavigationSection;
	activeScope: 'user' | 'workspace';
	formattingLanguage: FormattingLanguage;
	version: string;
	searchTerm: string;
}

const initialState: SettingsPanelState = {
	settings: {},
	vscodeSettings: initialVSCodeSettings,
	activeSection: 'appearance.display',
	activeScope: 'user',
	formattingLanguage: 'turtle',
	version: '',
	searchTerm: '',
};

// ── Root ───────────────────────────────────────────────────────

function SettingsPanel() {
	const [state, setState] = useWebviewState<SettingsPanelState>(initialState);

	const handleMessage = useCallback((message: SettingsPanelMessages) => {
		switch (message.id) {
			case 'GetSettingsResult':
			case 'OnSettingsChanged':
				setState(prev => ({ ...prev, settings: message.settings }));
				return;
			case 'GetVSCodeSettingsResult':
			case 'OnVSCodeSettingsChanged':
				setState(prev => ({
					...prev,
					vscodeSettings: { ...prev.vscodeSettings, [message.languageId]: message.settings },
				}));
				return;
			case 'GetVersionResult':
				setState(prev => ({ ...prev, version: message.version }));
				return;
			case 'NavigateTo':
				setState(prev => ({ ...prev, activeSection: message.section as SettingsNavigationSection }));
				return;
		}
	}, [setState]);

	const messaging = useWebviewMessaging<SettingsPanelMessages>(handleMessage);

	useStylesheet('settings-panel-styles', stylesheet);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetSettings' });
		messaging?.postMessage({ id: 'GetVSCodeSettings', languageId: 'turtle' });
		messaging?.postMessage({ id: 'GetVSCodeSettings', languageId: 'sparql' });
		messaging?.postMessage({ id: 'GetVersion' });
	}, []);

	const handleUpdate = useCallback((key: string, value: unknown) => {
		const scope: SettingScope = state.activeScope;
		setState(prev => ({
			...prev,
			settings: { ...prev.settings, [key]: { ...prev.settings[key], value, source: scope } },
		}));
		messaging?.postMessage({ id: 'UpdateSetting', key, value, scope });
	}, [state.activeScope, messaging, setState]);

	const handleScopeChange = useCallback((key: string, newScope: SettingScope, currentValue: unknown) => {
		setState(prev => ({
			...prev,
			settings: { ...prev.settings, [key]: { ...prev.settings[key], source: newScope } },
		}));
		messaging?.postMessage({ id: 'UpdateSetting', key, value: newScope === 'default' ? undefined : currentValue, scope: newScope });
	}, [messaging, setState]);

	const handleVSCodeUpdate = useCallback((languageId: LanguageId, key: string, value: unknown) => {
		const scope: SettingScope = state.activeScope;
		setState(prev => ({
			...prev,
			vscodeSettings: {
				...prev.vscodeSettings,
				[languageId]: {
					...prev.vscodeSettings[languageId],
					[key]: { ...prev.vscodeSettings[languageId]?.[key], value, source: scope },
				},
			},
		}));
		messaging?.postMessage({ id: 'UpdateVSCodeSetting', languageId, key, value, scope });
	}, [state.activeScope, messaging, setState]);

	const handleVSCodeScopeChange = useCallback((languageId: LanguageId, key: string, newScope: SettingScope, currentValue: unknown) => {
		setState(prev => ({
			...prev,
			vscodeSettings: {
				...prev.vscodeSettings,
				[languageId]: {
					...prev.vscodeSettings[languageId],
					[key]: { ...prev.vscodeSettings[languageId]?.[key], source: newScope },
				},
			},
		}));
		messaging?.postMessage({ id: 'UpdateVSCodeSetting', languageId, key, value: newScope === 'default' ? undefined : currentValue, scope: newScope });
	}, [messaging, setState]);

	const handleScopeTabChange = useCallback((scope: 'user' | 'workspace') => {
		setState(prev => ({ ...prev, activeScope: scope }));
	}, [setState]);

	const handleBulkScope = useCallback((keys: string[], scope: 'user' | 'workspace') => {
		for (const key of keys) {
			handleScopeChange(key, scope, state.settings[key]?.value);
		}
	}, [state.settings, handleScopeChange]);

	const handleMoveToScope = useCallback((key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => {
		messaging?.postMessage({ id: 'UpdateSetting', key, value, scope: toScope });
		messaging?.postMessage({ id: 'UpdateSetting', key, value: undefined, scope: fromScope });
		setState(prev => ({
			...prev,
			settings: { ...prev.settings, [key]: { ...prev.settings[key], source: toScope } },
		}));
	}, [messaging, setState]);

	const handleVSCodeMoveToScope = useCallback((languageId: LanguageId, key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => {
		messaging?.postMessage({ id: 'UpdateVSCodeSetting', languageId, key, value, scope: toScope });
		messaging?.postMessage({ id: 'UpdateVSCodeSetting', languageId, key, value: undefined, scope: fromScope });
		setState(prev => ({
			...prev,
			vscodeSettings: {
				...prev.vscodeSettings,
				[languageId]: {
					...prev.vscodeSettings[languageId],
					[key]: { ...prev.vscodeSettings[languageId]?.[key], source: toScope },
				},
			},
		}));
	}, [messaging, setState]);

	const handleNavSelect = useCallback((section: SettingsNavigationSection) => {
		setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }));
		if (section === 'editor.formatting') {
			messaging?.postMessage({ id: 'GetVSCodeSettings', languageId: state.formattingLanguage });
		}
	}, [state.formattingLanguage, messaging, setState]);

	const handleFormattingLanguageChange = useCallback((lang: FormattingLanguage) => {
		setState(prev => ({ ...prev, formattingLanguage: lang }));
		messaging?.postMessage({ id: 'GetVSCodeSettings', languageId: lang });
	}, [messaging, setState]);

	const handleSearchChange = useCallback((term: string) => {
		setState(prev => ({ ...prev, searchTerm: term }));
	}, [setState]);

	const commonProps = {
		settings: state.settings,
		activeScope: state.activeScope,
		onUpdate: handleUpdate,
		onScopeChange: handleScopeChange,
		onBulkScope: handleBulkScope,
	};

	const renderSection = () => {
		if (state.searchTerm.trim()) {
			return (
				<SearchResults
					searchTerm={state.searchTerm}
					settings={state.settings}
					onNavigate={section => setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }))}
				/>
			);
		}

		const entry = SECTION_REGISTRY[state.activeSection];
		if (!entry) return null;

		const SectionComponent = entry.component;

		return (
			<SectionComponent
				{...commonProps}
				keys={entry.keys}
				vscodeSettings={state.vscodeSettings}
				formattingLanguage={state.formattingLanguage}
				onFormattingLanguageChange={handleFormattingLanguageChange}
				onVSCodeUpdate={handleVSCodeUpdate}
				onVSCodeScopeChange={handleVSCodeScopeChange}
			/>
		);
	};

	return (
		<SettingsScopeContext.Provider value={state.activeScope}>
			<SettingsMoveContext.Provider value={handleMoveToScope}>
				<VSCodeSettingsMoveContext.Provider value={handleVSCodeMoveToScope}>
					<div className="settings-panel">
						<SettingsPanelHeader
							version={state.version}
							activeScope={state.activeScope}
							onScopeTabChange={handleScopeTabChange}
							searchTerm={state.searchTerm}
							onSearchChange={handleSearchChange}
						/>
						<div className="settings-body">
							<SettingsNavigation activeSection={state.activeSection} onSelect={handleNavSelect} />
							<div className="settings-content">
								<div className="settings-content-inner">
									{renderSection()}
								</div>
							</div>
						</div>
					</div>
				</VSCodeSettingsMoveContext.Provider>
			</SettingsMoveContext.Provider>
		</SettingsScopeContext.Provider>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
