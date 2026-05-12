import { useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { ConnectionsSection } from './sections/connections';
import { DefinitionsTreeSection } from './sections/definitions-tree';
import { DisplaySection } from './sections/display';
import { EditorGeneralSection } from './sections/editor-general';
import { EditorSettings, TestResult } from './components/types';
import { FormattingSection } from './sections/formatting';
import { IndexingSection } from './sections/indexing';
import { NavSection } from './settings-metadata';
import { PanelHeader } from './components/panel-header';
import { QuerySection } from './sections/query';
import { SearchResults } from './components/search-results';
import { SettingsNav } from './components/settings-nav';
import { SettingsPanelMessages, SettingScope, SettingState, LanguageId, FormattingLanguage } from './settings-panel-messages';
import { SettingsScopeContext, SettingsMoveContext, EditorSettingsMoveContext } from './components/setting-row';
import { SortingSection } from './sections/sorting';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlConnectionEditor } from '../sparql-connection/sparql-connection-editor';
import { TemplatesSection } from './sections/templates';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/webview-hooks';
import { ValidationSection } from './sections/validation';
import { SECTION_REGISTRY } from './settings-registry';
import stylesheet from './settings-panel.css';

// ── State ──────────────────────────────────────────────────────

interface PanelState {
	settings: Record<string, SettingState>;
	editorSettings: EditorSettings;
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	activeSection: NavSection;
	activeScope: 'user' | 'workspace';
	formattingLanguage: FormattingLanguage;
	version: string;
	searchTerm: string;
	editingConnection?: SparqlConnection;
}

const initialEditorSettings: EditorSettings = {
	turtle: {}, sparql: {}, trig: {}, n3: {}, ntriples: {}, nquads: {},
};

const initialState: PanelState = {
	settings: {},
	editorSettings: initialEditorSettings,
	connections: [],
	testResults: {},
	activeSection: 'appearance.display',
	activeScope: 'user',
	formattingLanguage: 'turtle',
	version: '',
	searchTerm: '',
	editingConnection: undefined,
};

// ── Root ───────────────────────────────────────────────────────

function SettingsPanel() {
	const [state, setState] = useWebviewState<PanelState>(initialState);

	const handleMessage = useCallback((message: SettingsPanelMessages) => {
		switch (message.id) {
			case 'GetSettingsResult':
			case 'OnSettingsChanged':
				setState(prev => ({ ...prev, settings: message.settings }));
				return;
			case 'GetEditorSettingsResult':
			case 'OnEditorSettingsChanged':
				setState(prev => ({
					...prev,
					editorSettings: { ...prev.editorSettings, [message.languageId]: message.settings },
				}));
				return;
			case 'GetConnectionsResult':
			case 'ConnectionsChanged':
				setState(prev => ({ ...prev, connections: message.connections }));
				return;
			case 'TestConnectionResult':
				setState(prev => ({
					...prev,
					testResults: {
						...prev.testResults,
						[message.connectionId]: message.success
							? { success: true }
							: { success: false, error: message.error },
					},
				}));
				return;
			case 'GetVersionResult':
				setState(prev => ({ ...prev, version: message.version }));
				return;
			case 'NavigateTo':
				setState(prev => ({ ...prev, activeSection: message.section as NavSection, editingConnection: undefined }));
				return;
			case 'OpenConnectionForm':
				setState(prev => ({ ...prev, activeSection: 'connections', editingConnection: message.connection }));
				return;
		}
	}, [setState]);

	const messaging = useWebviewMessaging<SettingsPanelMessages>(handleMessage);

	useStylesheet('settings-panel-styles', stylesheet);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetSettings' });
		messaging?.postMessage({ id: 'GetConnections' });
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: 'turtle' });
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: 'sparql' });
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

	const handleEditorUpdate = useCallback((languageId: LanguageId, key: string, value: unknown) => {
		const scope: SettingScope = state.activeScope;
		setState(prev => ({
			...prev,
			editorSettings: {
				...prev.editorSettings,
				[languageId]: {
					...prev.editorSettings[languageId],
					[key]: { ...prev.editorSettings[languageId]?.[key], value, source: scope },
				},
			},
		}));
		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value, scope });
	}, [state.activeScope, messaging, setState]);

	const handleEditorScopeChange = useCallback((languageId: LanguageId, key: string, newScope: SettingScope, currentValue: unknown) => {
		setState(prev => ({
			...prev,
			editorSettings: {
				...prev.editorSettings,
				[languageId]: {
					...prev.editorSettings[languageId],
					[key]: { ...prev.editorSettings[languageId]?.[key], source: newScope },
				},
			},
		}));
		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value: newScope === 'default' ? undefined : currentValue, scope: newScope });
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

	const handleEditorMoveToScope = useCallback((languageId: LanguageId, key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => {
		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value, scope: toScope });
		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value: undefined, scope: fromScope });
		setState(prev => ({
			...prev,
			editorSettings: {
				...prev.editorSettings,
				[languageId]: {
					...prev.editorSettings[languageId],
					[key]: { ...prev.editorSettings[languageId]?.[key], source: toScope },
				},
			},
		}));
	}, [messaging, setState]);

	const handleNavSelect = useCallback((section: NavSection) => {
		setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }));
		if (section === 'editor.formatting') {
			messaging?.postMessage({ id: 'GetEditorSettings', languageId: state.formattingLanguage });
		}
	}, [state.formattingLanguage, messaging, setState]);

	const handleFormattingLanguageChange = useCallback((lang: FormattingLanguage) => {
		setState(prev => ({ ...prev, formattingLanguage: lang }));
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: lang });
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

            if (state.activeSection === 'connections' && state.editingConnection) {
                    return (
                            <SparqlConnectionEditor
                                    connection={state.editingConnection}
                                    onBack={() => setState(prev => ({ ...prev, editingConnection: undefined }))}
                            />
                    );
            }

            const SectionComponent = entry.component;

            return (
                    <SectionComponent
                            {...commonProps}
                            keys={entry.keys}
                            // Props for formatting section
                            editorSettings={state.editorSettings}
                            formattingLanguage={state.formattingLanguage}
                            onFormattingLanguageChange={handleFormattingLanguageChange}
                            onEditorUpdate={handleEditorUpdate}
                            onEditorScopeChange={handleEditorScopeChange}
                            // Props for connections section
                            connections={state.connections}
                            testResults={state.testResults}
                            onCreateConnection={() => messaging?.postMessage({ id: 'CreateConnection' })}
                            onEditConnection={(conn: SparqlConnection) => setState(prev => ({ ...prev, editingConnection: conn }))}
                            onDeleteConnection={(conn: SparqlConnection) => messaging?.postMessage({ id: 'DeleteConnection', connection: conn })}
                            onTestConnection={(conn: SparqlConnection) => messaging?.postMessage({ id: 'TestConnection', connection: conn })}
                            onListGraphs={(conn: SparqlConnection) => messaging?.postMessage({ id: 'ListGraphs', connection: conn })}
                            onOpenInBrowser={(url: string) => messaging?.postMessage({ id: 'OpenInBrowser', url })}
                            onMoveConnection={(conn: SparqlConnection, toScope: ConfigurationScope) => messaging?.postMessage({ id: 'MoveConnection', connection: conn, toScope })}
                    />
            );
	};

	return (
		<SettingsScopeContext.Provider value={state.activeScope}>
			<SettingsMoveContext.Provider value={handleMoveToScope}>
				<EditorSettingsMoveContext.Provider value={handleEditorMoveToScope}>
					<div className="settings-panel">
						<PanelHeader
							version={state.version}
							activeScope={state.activeScope}
							onScopeTabChange={handleScopeTabChange}
							searchTerm={state.searchTerm}
							onSearchChange={handleSearchChange}
						/>
						<div className="settings-body">
							<SettingsNav activeSection={state.activeSection} onSelect={handleNavSelect} />
							<div className="settings-content">
								<div className="settings-content-inner">
									{renderSection()}
								</div>
							</div>
						</div>
					</div>
				</EditorSettingsMoveContext.Provider>
			</SettingsMoveContext.Provider>
		</SettingsScopeContext.Provider>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
