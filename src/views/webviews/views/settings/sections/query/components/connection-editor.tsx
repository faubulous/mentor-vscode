import * as React from 'react';
import { useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { ModalDialogHeaderActionsContext, ModalDialogTitleAccessoriesContext } from '@src/views/webviews/components/modal-dialog';
import { ScopeSelect } from '@src/views/webviews/components/scope-select';
import { useStylesheet, useVscodeElementRef, useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import { DEFAULT_GRAPH_RELOAD_INTERVAL_SECONDS, SparqlConnectionView } from '@src/languages/sparql/services/sparql-connection';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import {
	AuthCredential,
	BasicAuthCredential,
	BearerAuthCredential,
	EntraClientAuthCredential,
	MicrosoftAuthCredential
} from '@src/services/core/credential';
import { CredentialFactory } from '@src/services/core/credential-factory';
import { ConfigurationScope, ScopeKey, keyToScope } from '@src/utilities/config-scope';
import { ConnectionEditorMessages } from '../connection-editor-messages';
import modalFormStylesheet from '@src/views/webviews/components/modal-form.css';
import stylesheet from './connection-editor.css';

enum AuthTypeIndex {
	None = 0,
	Basic = 1,
	Bearer = 2,
	Microsoft = 3,
	EntraClientCredentials = 4
}

type ReloadIntervalUnit = 'minutes' | 'hours' | 'days';

function secondsToDisplayInterval(seconds: number): { value: number; unit: ReloadIntervalUnit } {
	if (seconds > 0 && seconds % 86400 === 0) {
		return { value: seconds / 86400, unit: 'days' };
	} else if (seconds > 0 && seconds % 3600 === 0) {
		return { value: seconds / 3600, unit: 'hours' };
	} else {
		return { value: Math.max(1, Math.round(seconds / 60)), unit: 'minutes' };
	}
}

function displayIntervalToSeconds(value: number, unit: ReloadIntervalUnit): number {
	return value * (unit === 'days' ? 86400 : unit === 'hours' ? 3600 : 60);
}

interface FormState {
	endpoint: SparqlConnectionView;
	selectedAuthTypeIndex: AuthTypeIndex;
	basicCredential: BasicAuthCredential;
	bearerCredential: BearerAuthCredential;
	microsoftCredential: MicrosoftAuthCredential;
	entraClientCredential: EntraClientAuthCredential;
	passwordVisible: boolean;
	hasUnsavedChanges: boolean;
	activeTabIndex: number;
	reloadIntervalValue: number;
	reloadIntervalUnit: ReloadIntervalUnit;
}

function makeInitialFormState(connection: SparqlConnectionView): FormState {
	// Materialize the default interval into the draft so saving persists the value the
	// form displays — otherwise the 24h default would be display-only and never saved.
	const graphReloadIntervalSeconds = connection.graphReloadIntervalSeconds || DEFAULT_GRAPH_RELOAD_INTERVAL_SECONDS;
	const { value: reloadIntervalValue, unit: reloadIntervalUnit } = secondsToDisplayInterval(graphReloadIntervalSeconds);

	return {
		endpoint: { ...connection, graphReloadIntervalSeconds },
		selectedAuthTypeIndex: AuthTypeIndex.None,
		basicCredential: CredentialFactory.createBasicAuthCredential(),
		bearerCredential: CredentialFactory.createBearerAuthCredential(),
		microsoftCredential: CredentialFactory.createMicrosoftAuthCredential(),
		entraClientCredential: CredentialFactory.createEntraClientCredential(),
		passwordVisible: false,
		hasUnsavedChanges: false,
		activeTabIndex: 0,
		reloadIntervalValue,
		reloadIntervalUnit,
	};
}

export interface ConnectionEditorProps {
	/**
	 * The connection being edited. For a new connection this is a freshly created, unsaved record.
	 */
	connection: SparqlConnectionView;

	/**
	 * Called after a successful save, e.g. to close the modal.
	 */
	onSaved: () => void;

	/**
	 * Notifies the host whenever the form's unsaved-changes state changes.
	 */
	onDirtyChange: (dirty: boolean) => void;
}

/**
 * The form rendered inside the connection edit modal. Holds a local draft of the
 * connection plus its credential, and commits everything with a single
 * `SaveSparqlConnection` on Save (the host's save persists every field and migrates
 * scope). Owns its own scoped messaging for credential loading, testing, store-type
 * discovery and Microsoft auth. Save/Test portal into the modal header. Styling follows
 * the shared `modal-form` look used by the store editor.
 */
export function ConnectionEditor({ connection, onSaved, onDirtyChange }: ConnectionEditorProps) {
	const [draft, setDraft] = useState<FormState>(() => makeInitialFormState(connection));
	const [testResult, setTestResult] = useState<{ code: number; message: string } | null | undefined>(undefined);
	const [isTesting, setIsTesting] = useState(false);
	const [storeConfigs, setStoreConfigs] = useState<TripleStoreConfig[]>([]);

	const headerActionsSlot = useContext(ModalDialogHeaderActionsContext);
	const titleAccessoriesSlot = useContext(ModalDialogTitleAccessoriesContext);

	useSharedStylesheets();
	useStylesheet('modal-form-styles', modalFormStylesheet);
	useStylesheet('connection-editor-styles', stylesheet);

	const handleMessage = useCallback((message: ConnectionEditorMessages) => {
		switch (message.id) {
			case 'GetSparqlConnectionCredentialResult': {
				if (connection.id && message.connectionId !== connection.id) {
					return;
				}
				// Loading the stored credential: populate the matching auth tab without marking dirty.
				const credential = message.credential ?? null;
				setDraft(prev => {
					if (!credential) {
						return { ...prev, selectedAuthTypeIndex: AuthTypeIndex.None };
					} else if (credential.type === 'basic') {
						return { ...prev, selectedAuthTypeIndex: AuthTypeIndex.Basic, basicCredential: credential as BasicAuthCredential };
					} else if (credential.type === 'bearer') {
						return { ...prev, selectedAuthTypeIndex: AuthTypeIndex.Bearer, bearerCredential: credential as BearerAuthCredential };
					} else if (credential.type === 'microsoft') {
						return { ...prev, selectedAuthTypeIndex: AuthTypeIndex.Microsoft, microsoftCredential: credential as MicrosoftAuthCredential };
					} else if (credential.type === 'entra-client-credentials') {
						return { ...prev, selectedAuthTypeIndex: AuthTypeIndex.EntraClientCredentials, entraClientCredential: credential as EntraClientAuthCredential };
					}
					return prev;
				});
				return;
			}
			case 'TestSparqlConnectionResult': {
				setIsTesting(false);
				setTestResult(message.error);
				return;
			}
			case 'GetStoreTypesResult': {
				setStoreConfigs(message.storeConfigs);
				return;
			}
			case 'FetchMicrosoftAuthCredentialResult': {
				if (connection.id && message.connectionId !== connection.id) {
					return;
				}
				if (message.credential) {
					setDraft(prev => ({
						...prev,
						selectedAuthTypeIndex: AuthTypeIndex.Microsoft,
						microsoftCredential: message.credential as MicrosoftAuthCredential,
						hasUnsavedChanges: true,
					}));
				}
				return;
			}
		}
	}, [connection.id]);

	const messaging = useScopedWebviewMessaging<ConnectionEditorMessages>('query.connections', handleMessage);

	// Reseed the form only when a different connection is opened — depending on the
	// `connection` object itself would wipe the user's draft edits whenever the parent
	// re-renders with a fresh object for the same connection.
	useEffect(() => {
		setDraft(makeInitialFormState(connection));
		setTestResult(undefined);
		setIsTesting(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connection.id]);

	// Load the stored credential and available store types once messaging is ready.
	useEffect(() => {
		messaging?.postMessage({ id: 'GetSparqlConnectionCredential', connectionId: connection.id });
		messaging?.postMessage({ id: 'GetStoreTypes' });
	}, [connection.id, messaging]);

	useEffect(() => {
		onDirtyChange(draft.hasUnsavedChanges);
	}, [draft.hasUnsavedChanges, onDirtyChange]);

	const handleScopeChange = (scope: ScopeKey) => {
		const configScope = keyToScope(scope);

		setDraft(prev => ({
			...prev,
			endpoint: { ...prev.endpoint, configScope },
			hasUnsavedChanges: true,
		}));
	};

	const authTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		setDraft(prev => ({ ...prev, selectedAuthTypeIndex: parseInt(element.value, 10), hasUnsavedChanges: true }));
	});

	const storeTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		const storeType = element.value;

		setDraft(prev => {
			if (prev.endpoint.storeType === storeType) {
				return prev;
			}

			return { ...prev, endpoint: { ...prev.endpoint, storeType, isModified: true }, hasUnsavedChanges: true };
		});
	});

	const reloadUnitSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		const unit = element.value as ReloadIntervalUnit;

		setDraft(prev => {
			const graphReloadIntervalSeconds = displayIntervalToSeconds(prev.reloadIntervalValue, unit);
			const endpoint = { ...prev.endpoint, graphReloadIntervalSeconds };

			// A reload time only applies to day-based intervals.
			if (unit !== 'days') {
				delete endpoint.graphReloadTime;
			}

			return {
				...prev,
				reloadIntervalUnit: unit,
				endpoint,
				hasUnsavedChanges: true,
			};
		});
	});

	// Chromium renders a clock glyph inside `type="time"` inputs that does not follow
	// the editor theme. The input lives in the component's shadow root, out of reach
	// of page stylesheets, so the rule hiding it is injected into the shadow root.
	const reloadTimeFieldRef = useCallback((element: HTMLElement | null) => {
		const shadowRoot = element?.shadowRoot;

		if (shadowRoot && !shadowRoot.querySelector('#hide-picker-icon')) {
			const style = document.createElement('style');
			style.id = 'hide-picker-icon';
			style.textContent = 'input::-webkit-calendar-picker-indicator { display: none; }';
			shadowRoot.appendChild(style);
		}
	}, []);

	const tabsRef = useVscodeElementRef<HTMLElement & { selectedIndex: number }, { selectedIndex: number }>(
		'vsc-tabs-select',
		(element) => {
			setDraft(prev => ({ ...prev, activeTabIndex: element.selectedIndex }));
		}
	);

	const isFormReadOnly = () => draft.endpoint.isProtected === true;
	const isWorkspaceStore = draft.endpoint.id === 'workspace';
	const showScopeTabs = !isWorkspaceStore;

	// A connection may only use preset stores (no configScope) or stores defined
	// in its own configuration scope: a cross-scope reference breaks as soon as
	// the settings roam (version control, Settings Sync) because the other scope
	// is not carried along.
	const isStoreScopeCompatible = () => {
		const store = storeConfigs.find(s => s.id === (draft.endpoint.storeType ?? 'sparql'));

		return store?.configScope === undefined || store.configScope === draft.endpoint.configScope;
	};

	const isFormValid = () => draft.endpoint.endpointUrl.trim().length > 0 && isStoreScopeCompatible();
	const isConnectionSuccessful = () => testResult === null;
	const hasConnectionError = () => testResult !== null && testResult !== undefined;

	const getSelectedCredential = (): AuthCredential | null => {
		switch (draft.selectedAuthTypeIndex) {
			case AuthTypeIndex.Basic: return draft.basicCredential;
			case AuthTypeIndex.Bearer: return draft.bearerCredential;
			case AuthTypeIndex.Microsoft: return draft.microsoftCredential;
			case AuthTypeIndex.EntraClientCredentials: return draft.entraClientCredential;
			default: return null;
		}
	};

	const getEndpointSectionClassName = () => {
		const className = ['section-endpoint-url', 'row'];

		if (isFormReadOnly()) {
			className.push('readonly');
		}
		return className.join(' ');
	};

	const handleDescriptionChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;

		setDraft(prev => ({
			...prev,
			endpoint: { ...prev.endpoint, description: value || undefined },
			hasUnsavedChanges: true,
		}));
	};

	const handleEndpointUrlChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;

		setDraft(prev => ({
			...prev,
			endpoint: { ...prev.endpoint, isModified: true, endpointUrl: value },
			hasUnsavedChanges: true,
		}));
	};

	const submitSave = () => {
		messaging?.postMessage({ id: 'SaveSparqlConnection', connection: draft.endpoint, credential: getSelectedCredential() });
		setDraft(prev => ({ ...prev, hasUnsavedChanges: false }));
		onSaved();
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		submitSave();
	};

	const handleSaveClick = (e: React.MouseEvent) => {
		e.preventDefault();
		submitSave();
	};

	const handleTest = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsTesting(true);
		setTestResult(undefined);
		messaging?.postMessage({ id: 'TestSparqlConnection', connection: draft.endpoint, credential: getSelectedCredential() });
	};

	const endpoint = draft.endpoint;

	const selectedStoreType = endpoint.storeType ?? 'sparql';
	const selectedStoreConfig = storeConfigs.find(s => s.id === selectedStoreType);
	// Derive inference capability from the selected store type so the toggle updates live on change.
	const canToggleInference = selectedStoreConfig?.inference?.supported ?? endpoint.canToggleInference ?? false;

	// Stores from the other configuration scope stay listed but are disabled and
	// labeled with their scope, so the picker shows why they are unavailable.
	const storeScopeCompatible = isStoreScopeCompatible();

	const isIncompatibleStore = (store: TripleStoreConfig) =>
		store.configScope !== undefined && store.configScope !== endpoint.configScope;

	const scopeLabel = (scope: ConfigurationScope | undefined) => scope === ConfigurationScope.User ? 'user' : 'workspace';

	const renderFormActions = () => (
		<div className={`form-actions ${isFormReadOnly() ? 'readonly' : ''}`}>
			{isFormReadOnly() && <vscode-icon name="lock" title="Built-in connection" />}
			{!isFormReadOnly() && <>
				{isTesting && (
					<span className="form-status-text">Testing…</span>
				)}
				{!isTesting && isConnectionSuccessful() && (
					<vscode-icon name="pass" className="form-status-icon icon-success" title="Connection successful" />
				)}
				{!isTesting && hasConnectionError() && (
					<vscode-icon name="error" className="form-status-icon icon-error" title={testResult!.message} />
				)}
				<vscode-toolbar-button title="Test connection"
					onClick={handleTest}
					disabled={!isFormValid() || isFormReadOnly() || isTesting}>
					<vscode-icon name="debug-disconnect" />
				</vscode-toolbar-button>
				<vscode-button title="Save connection" onClick={handleSaveClick} disabled={!isFormValid() || !draft.hasUnsavedChanges}>
					Save
				</vscode-button>
			</>}
		</div>
	);

	const renderBasicAuthFields = () => {
		const credential = draft.basicCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Username</vscode-label>
				<vscode-textfield
					value={credential?.username ?? ''}
					placeholder="myuser"
					label="Username"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, basicCredential: { ...credential!, username: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Password</vscode-label>
				<vscode-textfield
					value={credential?.password ?? ''}
					label="Password"
					type={draft.passwordVisible ? 'text' : 'password'}
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, basicCredential: { ...credential!, password: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				>
					<vscode-icon
						slot="content-after"
						name={draft.passwordVisible ? 'eye-closed' : 'eye'}
						title="Toggle visibility"
						action-icon
						onClick={() => setDraft(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
					/>
				</vscode-textfield>
			</vscode-form-group>
		);
	};

	const renderBearerAuthFields = () => {
		const credential = draft.bearerCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Token Prefix</vscode-label>
				<vscode-textfield
					value={credential?.prefix ?? ''}
					placeholder="Bearer"
					label="Token Prefix"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, bearerCredential: { ...credential, prefix: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Token</vscode-label>
				<vscode-textarea
					value={credential?.token ?? ''}
					placeholder="Token"
					label="Token"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, bearerCredential: { ...credential, token: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
			</vscode-form-group>
		);
	};

	const renderMicrosoftAuthFields = () => {
		const credential = draft.microsoftCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Scopes</vscode-label>
				<vscode-textarea
					rows={5}
					value={credential?.scopes.join('\n') ?? ''}
					placeholder="scopes"
					label="Scopes"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, microsoftCredential: { ...credential!, scopes: (e.target as HTMLInputElement).value.split('\n') }, hasUnsavedChanges: true }));
					}}
				/>
				<p>
					<vscode-button title="Fetch a new Microsoft authentication token" onClick={() => messaging?.postMessage({ id: 'FetchMicrosoftAuthCredential', connectionId: endpoint.id, scopes: draft.microsoftCredential?.scopes ?? [] })}>
						Get Token
					</vscode-button>
				</p>
			</vscode-form-group>
		);
	};

	const renderEntraClientCredentialsFields = () => {
		const credential = draft.entraClientCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Tenant ID</vscode-label>
				<vscode-textfield
					value={credential?.tenantId ?? ''}
					placeholder="00000000-0000-0000-0000-000000000000"
					label="Tenant ID"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, entraClientCredential: { ...credential, tenantId: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Client ID</vscode-label>
				<vscode-textfield
					value={credential?.clientId ?? ''}
					placeholder="00000000-0000-0000-0000-000000000000"
					label="Client ID"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, entraClientCredential: { ...credential, clientId: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Client Secret</vscode-label>
				<vscode-textfield
					value={credential?.clientSecret ?? ''}
					placeholder="Client Secret"
					label="Client Secret"
					type={draft.passwordVisible ? 'text' : 'password'}
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, entraClientCredential: { ...credential, clientSecret: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				>
					<vscode-icon
						slot="content-after"
						name={draft.passwordVisible ? 'eye-closed' : 'eye'}
						title="Toggle visibility"
						action-icon
						onClick={() => setDraft(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
					/>
				</vscode-textfield>
				<vscode-label>Scopes</vscode-label>
				<vscode-textarea
					rows={3}
					value={credential?.scopes.join('\n') ?? ''}
					placeholder="api://your-app-id/.default"
					label="Scopes"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setDraft(prev => ({ ...prev, entraClientCredential: { ...credential, scopes: (e.target as HTMLInputElement).value.split('\n').filter(s => s.trim()) }, hasUnsavedChanges: true }));
					}}
				/>
			</vscode-form-group>
		);
	};

	const statusClass = !isTesting && isConnectionSuccessful()
		? ' status-success'
		: !isTesting && hasConnectionError()
			? ' status-error'
			: '';

	return (
		<div className={`modal-form connection-editor-container${statusClass}`}>
			{isTesting && <vscode-progress-bar />}
			{headerActionsSlot && createPortal(renderFormActions(), headerActionsSlot)}
			<form onSubmit={handleFormSubmit}>
				<div className="form-body">
					<vscode-tabs ref={tabsRef} selectedIndex={draft.activeTabIndex}>
						<vscode-tab-header slot="header">General</vscode-tab-header>
						<vscode-tab-panel>
							<section>
								<div>
									<vscode-label>Endpoint URL</vscode-label>
									<div className={getEndpointSectionClassName()}>
										<vscode-textfield
											required
											value={endpoint.endpointUrl}
											title='Endpoint URL'
											placeholder="https://example.org/sparql"
											disabled={isFormReadOnly()}
											onInput={handleEndpointUrlChange}
										/>
									</div>
								</div>
								<div className="section-endpoint-description">
									<vscode-label>Description <span className="label-optional">(optional)</span></vscode-label>
									<vscode-textfield
										value={endpoint.description ?? ''}
										disabled={isFormReadOnly()}
										onInput={handleDescriptionChange}
									/>
								</div>
								{!isWorkspaceStore && (
									<div className="section-store-type">
										<vscode-label>Store</vscode-label>
										<vscode-single-select
											className="wide"
											ref={storeTypeSelectRef}
											value={selectedStoreType}
											disabled={isFormReadOnly()}>
											{storeConfigs.map(s => (
												<vscode-option key={s.id} value={s.id} disabled={isIncompatibleStore(s)}>
													{isIncompatibleStore(s)
														? `${s.label} - ${s.configScope === ConfigurationScope.User ? 'User' : 'Workspace'} settings`
														: s.label}
												</vscode-option>
											))}
										</vscode-single-select>
									</div>
								)}
								{!isWorkspaceStore && !storeScopeCompatible && selectedStoreConfig && (
									<div className="store-scope-warning">
										<span className="codicon codicon-warning-compact"></span> This store is defined in {selectedStoreConfig.configScope === ConfigurationScope.User ? 'your user settings' : 'the workspace settings'} and
										can't be used by a {scopeLabel(endpoint.configScope)} connection.
									</div>
								)}
								{!canToggleInference && (
									<vscode-checkbox
										className="section-reasoning-checkbox"
										disabled={true}>
										Per query reasoning control not supported
									</vscode-checkbox>
								)}
								{canToggleInference && (
									<vscode-checkbox
										className="section-reasoning-checkbox"
										checked={endpoint.inferenceEnabled ?? false}
										onChange={() => {
											setDraft(prev => ({ ...prev, endpoint: { ...prev.endpoint, inferenceEnabled: !prev.endpoint.inferenceEnabled } }));
											messaging?.postMessage({ id: 'ToggleSparqlConnectionInference', connectionId: endpoint.id });
										}}>
										Enable query reasoning by default
									</vscode-checkbox>
								)}
								{!isWorkspaceStore && (
									<div className="section-graph-loading">
										<vscode-checkbox
											checked={endpoint.autoLoadGraphs ?? false}
											disabled={isFormReadOnly()}
											onChange={() => {
												setDraft(prev => ({
													...prev,
													endpoint: { ...prev.endpoint, autoLoadGraphs: !prev.endpoint.autoLoadGraphs },
													hasUnsavedChanges: true,
												}));
											}}>
											Load graphs automatically every
										</vscode-checkbox>
										<div className="section-graph-loading-interval">
											<vscode-textfield
												value={draft.reloadIntervalValue.toString()}
												disabled={isFormReadOnly() || !endpoint.autoLoadGraphs}
												onInput={(e: React.FormEvent<HTMLElement>) => {
													const raw = parseInt((e.target as HTMLInputElement).value, 10);
													const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
													const graphReloadIntervalSeconds = displayIntervalToSeconds(value, draft.reloadIntervalUnit);
													setDraft(prev => ({
														...prev,
														reloadIntervalValue: value,
														endpoint: { ...prev.endpoint, graphReloadIntervalSeconds },
														hasUnsavedChanges: true,
													}));
												}}
											/>
											<vscode-single-select
												ref={reloadUnitSelectRef}
												value={draft.reloadIntervalUnit}
												disabled={isFormReadOnly() || !endpoint.autoLoadGraphs}>
												<vscode-option value="minutes">minutes</vscode-option>
												<vscode-option value="hours">hours</vscode-option>
												<vscode-option value="days">days</vscode-option>
											</vscode-single-select>
											{draft.reloadIntervalUnit === 'days' && (
												<>
													<span className="section-graph-loading-interval-label">after</span>
													<vscode-textfield
														ref={reloadTimeFieldRef}
														className="reload-time"
														type="time"
														value={draft.endpoint.graphReloadTime ?? ''}
														disabled={isFormReadOnly() || !endpoint.autoLoadGraphs}
														onInput={(e: React.FormEvent<HTMLElement>) => {
															const graphReloadTime = (e.target as HTMLInputElement).value;
															setDraft(prev => {
																const endpoint = { ...prev.endpoint };

																if (graphReloadTime) {
																	endpoint.graphReloadTime = graphReloadTime;
																} else {
																	delete endpoint.graphReloadTime;
																}

																return { ...prev, endpoint, hasUnsavedChanges: true };
															});
														}}
													/>
												</>
											)}
										</div>
									</div>
								)}
							</section>
						</vscode-tab-panel>
						<vscode-tab-header slot="header">Authentication</vscode-tab-header>
						<vscode-tab-panel>
							<section className="auth">
								<div className="column-1">
									<vscode-label>Authentication Type</vscode-label>
									<vscode-single-select
										className="wide"
										ref={authTypeSelectRef}
										value={draft.selectedAuthTypeIndex.toString()}
										disabled={isFormReadOnly()}>
										<vscode-option value="0">None</vscode-option>
										<vscode-option value="1">HTTP Basic</vscode-option>
										<vscode-option value="2">HTTP Bearer</vscode-option>
										<vscode-option value="3">Entra SSO</vscode-option>
										<vscode-option value="4">Entra Client Credentials</vscode-option>
									</vscode-single-select>
								</div>
								{draft.selectedAuthTypeIndex !== AuthTypeIndex.None && (
									<div className="vertical-separator">
										{draft.selectedAuthTypeIndex === AuthTypeIndex.Basic && renderBasicAuthFields()}
										{draft.selectedAuthTypeIndex === AuthTypeIndex.Bearer && renderBearerAuthFields()}
										{draft.selectedAuthTypeIndex === AuthTypeIndex.Microsoft && renderMicrosoftAuthFields()}
										{draft.selectedAuthTypeIndex === AuthTypeIndex.EntraClientCredentials && renderEntraClientCredentialsFields()}
									</div>
								)}
							</section>
						</vscode-tab-panel>
					</vscode-tabs>
					{showScopeTabs && titleAccessoriesSlot && createPortal(
						<ScopeSelect
							value={endpoint.configScope === ConfigurationScope.User ? 'user' : 'workspace'}
							onChange={handleScopeChange}
							disabled={isFormReadOnly()}
						/>,
						titleAccessoriesSlot
					)}
				</div>
			</form>
		</div>
	);
}
