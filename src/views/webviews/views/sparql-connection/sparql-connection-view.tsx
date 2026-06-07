import * as React from 'react';
import { useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { ModalDialogHeaderActionsContext, ModalDialogTitleAccessoriesContext } from '@src/views/webviews/components/modal-dialog';
import { ScopeSelect } from '@src/views/webviews/components/scope-select';
import { useStylesheet, useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlStoreConfig } from '@src/languages/sparql/services/sparql-store-config';
import {
	AuthCredential,
	BasicAuthCredential,
	BearerAuthCredential,
	EntraClientAuthCredential,
	MicrosoftAuthCredential
} from '@src/services/core/credential';
import { CredentialFactory } from '@src/services/core/credential-factory';
import { ConfigurationScope } from '@src/utilities/config-scope';
import modalFormStylesheet from '@src/views/webviews/components/modal-form.css';
import stylesheet from './sparql-connection-view.css';

enum AuthTypeIndex {
	None = 0,
	Basic = 1,
	Bearer = 2,
	Microsoft = 3,
	EntraClientCredentials = 4
}

interface FormState {
	endpoint: SparqlConnection;
	selectedAuthTypeIndex: AuthTypeIndex;
	basicCredential: BasicAuthCredential;
	bearerCredential: BearerAuthCredential;
	microsoftCredential: MicrosoftAuthCredential;
	entraClientCredential: EntraClientAuthCredential;
	passwordVisible: boolean;
	hasUnsavedChanges: boolean;
	activeTabIndex: number;
}

function makeInitialFormState(connection: SparqlConnection): FormState {
	return {
		endpoint: connection,
		selectedAuthTypeIndex: AuthTypeIndex.None,
		basicCredential: CredentialFactory.createBasicAuthCredential(),
		bearerCredential: CredentialFactory.createBearerAuthCredential(),
		microsoftCredential: CredentialFactory.createMicrosoftAuthCredential(),
		entraClientCredential: CredentialFactory.createEntraClientCredential(),
		passwordVisible: false,
		hasUnsavedChanges: false,
		activeTabIndex: 0,
	};
}

export interface SparqlConnectionViewProps {
	connection: SparqlConnection;

	/** Descriptors for the available store types, used to populate the store-type dropdown. */
	storeConfigs: SparqlStoreConfig[];

	/** Loaded credential from storage. undefined = loading, null = no credential. */
	initialCredential?: AuthCredential | null;

	/** Test result. undefined = not tested, null = success, error object = failure. */
	testResult?: { code: number; message: string } | null;

	isTesting: boolean;

	/** A freshly fetched Microsoft token; when non-null, replaces the Microsoft credential fields. */
	fetchedMicrosoftCredential?: MicrosoftAuthCredential | null;

	/** When true, renders an inline scope (User/Workspace) dropdown in the form. */
	showScopeSelector?: boolean;

	/**
	 * When true, suppresses the internal form header (back button + title) and renders the
	 * action buttons in a toolbar row above the form body instead. Use when hosting the
	 * view in a chrome that already provides a title and close affordance (e.g. a modal).
	 */
	hideHeader?: boolean;

	/** Optional back button, used when embedded inside a larger view. */
	onBack?: () => void;

	/** Called after a successful save, e.g. to navigate back. Only used in embedded contexts. */
	onSaved?: () => void;

	/** Notifies the host whenever the form's unsaved-changes state changes. */
	onDirtyChange?: (dirty: boolean) => void;

	onSave(connection: SparqlConnection, credential: AuthCredential | null): void;

	onUpdate(connection: SparqlConnection): void;

	onDelete(connection: SparqlConnection): void;

	onRequestTest(connection: SparqlConnection, credential: AuthCredential | null): void;

	onRequestCredential(connectionId: string): void;

	onToggleInference(connectionId: string): void;

	onFetchMicrosoftCredential(connectionId: string, scopes: string[]): void;
}

export function SparqlConnectionView(props: SparqlConnectionViewProps) {
	const {
		connection, storeConfigs, initialCredential, testResult, isTesting, fetchedMicrosoftCredential,
		showScopeSelector, hideHeader,
		onBack, onSaved, onSave, onUpdate, onRequestTest,
		onRequestCredential, onToggleInference, onFetchMicrosoftCredential,
		onDirtyChange,
	} = props;

	const [state, setState] = useState<FormState>(() => makeInitialFormState(connection));
	const headerActionsSlot = useContext(ModalDialogHeaderActionsContext);
	const titleAccessoriesSlot = useContext(ModalDialogTitleAccessoriesContext);

	useSharedStylesheets();
	useStylesheet('modal-form-styles', modalFormStylesheet);
	useStylesheet('sparql-connection-view-styles', stylesheet);

	// Reset form and reload data when a different connection is shown.
	useEffect(() => {
		setState(makeInitialFormState(connection));
		onRequestCredential(connection.id);
	}, [connection.id]);

	// Populate credential fields when the stored credential arrives.
	useEffect(() => {
		if (initialCredential === undefined) {
			return;
		} else if (!initialCredential) {
			setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.None }));
		} else if (initialCredential.type === 'basic') {
			setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.Basic, basicCredential: initialCredential as BasicAuthCredential }));
		} else if (initialCredential.type === 'bearer') {
			setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.Bearer, bearerCredential: initialCredential as BearerAuthCredential }));
		} else if (initialCredential.type === 'microsoft') {
			setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.Microsoft, microsoftCredential: initialCredential as MicrosoftAuthCredential }));
		} else if (initialCredential.type === 'entra-client-credentials') {
			setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.EntraClientCredentials, entraClientCredential: initialCredential as EntraClientAuthCredential }));
		}
	}, [initialCredential]);

	// Update microsoft credential fields when a freshly fetched token arrives.
	useEffect(() => {
		if (fetchedMicrosoftCredential) {
			setState(prev => ({
				...prev,
				selectedAuthTypeIndex: AuthTypeIndex.Microsoft,
				microsoftCredential: fetchedMicrosoftCredential,
				hasUnsavedChanges: true,
			}));
		}
	}, [fetchedMicrosoftCredential]);

	useEffect(() => {
		onDirtyChange?.(state.hasUnsavedChanges);
	}, [state.hasUnsavedChanges, onDirtyChange]);

	// Sync local endpoint scope when the incoming connection.configScope changes (e.g. scope tab switch).
	useEffect(() => {
		setState(prev => {
			if (prev.endpoint.configScope === connection.configScope) {
				return prev;
			}

			const endpoint = {
				...prev.endpoint,
				configScope: connection.configScope
			};

			onUpdate(endpoint);

			return {
				...prev,
				endpoint,
				hasUnsavedChanges: true
			};
		});
	}, [connection.configScope]);

	const handleScopeChange = (scope: 'user' | 'workspace') => {
		const newConfigScope = scope === 'user' ? ConfigurationScope.User : ConfigurationScope.Workspace;

		setState(prev => {
			const endpoint = {
				...prev.endpoint,
				configScope: newConfigScope
			};

			onUpdate(endpoint);

			return {
				...prev,
				endpoint,
				hasUnsavedChanges: true
			};
		});
	};

	const authTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		setState(prev => ({ ...prev, selectedAuthTypeIndex: parseInt(element.value, 10), hasUnsavedChanges: true }));
	});

	const storeTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		const storeType = element.value;

		setState(prev => {
			if (prev.endpoint.storeType === storeType) {
				return prev;
			}

			const endpoint = { ...prev.endpoint, storeType, isModified: true };

			onUpdate(endpoint);

			return { ...prev, endpoint, hasUnsavedChanges: true };
		});
	});

	const tabsRef = useVscodeElementRef<HTMLElement & { selectedIndex: number }, { selectedIndex: number }>(
		'vsc-tabs-select',
		(element) => {
			setState(prev => ({ ...prev, activeTabIndex: element.selectedIndex }));
		}
	);

	const isFormReadOnly = () => state.endpoint.isProtected === true;
	const isWorkspaceStore = state.endpoint.id === 'workspace';
	const showScopeTabs = showScopeSelector && !isWorkspaceStore;
	const isFormValid = () => state.endpoint.endpointUrl.trim().length > 0;
	const isConnectionSuccessful = () => testResult === null;
	const hasConnectionError = () => testResult !== null && testResult !== undefined;
	const wasConnectionTested = () => isTesting || isConnectionSuccessful() || hasConnectionError();

	const getSelectedCredential = (): AuthCredential | null => {
		switch (state.selectedAuthTypeIndex) {
			case AuthTypeIndex.Basic: return state.basicCredential;
			case AuthTypeIndex.Bearer: return state.bearerCredential;
			case AuthTypeIndex.Microsoft: return state.microsoftCredential;
			case AuthTypeIndex.EntraClientCredentials: return state.entraClientCredential;
			default: return null;
		}
	};

	const getEndpointSectionClassName = () => {
		const className = ['section-endpoint-url', 'row'];

		if (isFormReadOnly()) {

			className.push('readonly');
		}
		if (isTesting) {
			className.push('status-testing');
		}

		if (testResult) {
			className.push('status-error');
		} else if (testResult === null) {
			className.push('status-success');
		}

		return className.join(' ');
	};

	const handleDescriptionChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;

		setState(prev => {
			const endpoint = {
				...prev.endpoint,
				description: value || undefined
			};

			onUpdate(endpoint);

			return {
				...prev,
				endpoint,
				hasUnsavedChanges: true
			};
		});
	};

	const handleEndpointUrlChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;

		setState(prev => {
			const endpoint = {
				...prev.endpoint,
				isModified: true,
				endpointUrl: value
			};

			onUpdate(endpoint);

			return {
				...prev,
				endpoint,
				hasUnsavedChanges: true
			};
		});
	};

	const submitSave = () => {
		onSave(state.endpoint, getSelectedCredential());
		setState(prev => ({ ...prev, hasUnsavedChanges: false }));
		onSaved?.();
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
		onRequestTest(state.endpoint, getSelectedCredential());
	};

	const endpoint = state.endpoint;

	const selectedStoreType = endpoint.storeType ?? 'sparql';
	const selectedStoreConfig = storeConfigs.find(s => s.id === selectedStoreType);
	// Derive inference capability from the selected store type so the toggle updates live on change.
	const inferenceSupported = selectedStoreConfig?.inference?.supported ?? endpoint.inferenceSupported ?? false;

	const renderFormActions = () => (
		<div className={`form-actions ${isFormReadOnly() ? 'readonly' : ''}`}>
			{isFormReadOnly() && <vscode-icon name="lock" title="Built-in connection" />}
			{!isFormReadOnly() && <>
				<vscode-toolbar-button title="Test connection"
					onClick={handleTest}
					disabled={!isFormValid() || isFormReadOnly() || isTesting}				>
					<vscode-icon name="debug-disconnect" />
				</vscode-toolbar-button>
				<vscode-button title="Save connection" onClick={handleSaveClick} disabled={!isFormValid() || !state.hasUnsavedChanges}>
					Save
				</vscode-button>
			</>}
		</div>
	);

	const renderBasicAuthFields = () => {
		const credential = state.basicCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Username</vscode-label>
				<vscode-textfield
					value={credential?.username ?? ''}
					placeholder="myuser"
					label="Username"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, basicCredential: { ...credential!, username: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Password</vscode-label>
				<vscode-textfield
					value={credential?.password ?? ''}
					label="Password"
					type={state.passwordVisible ? 'text' : 'password'}
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, basicCredential: { ...credential!, password: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				>
					<vscode-icon
						slot="content-after"
						name={state.passwordVisible ? 'eye-closed' : 'eye'}
						title="Toggle visibility"
						action-icon
						onClick={() => setState(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
					/>
				</vscode-textfield>
			</vscode-form-group>
		);
	};

	const renderBearerAuthFields = () => {
		const credential = state.bearerCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Token Prefix</vscode-label>
				<vscode-textfield
					value={credential?.prefix ?? ''}
					placeholder="Bearer"
					label="Token Prefix"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, bearerCredential: { ...credential, prefix: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Token</vscode-label>
				<vscode-textarea
					value={credential?.token ?? ''}
					placeholder="Token"
					label="Token"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, bearerCredential: { ...credential, token: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
			</vscode-form-group>
		);
	};

	const renderMicrosoftAuthFields = () => {
		const credential = state.microsoftCredential;

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
						setState(prev => ({ ...prev, microsoftCredential: { ...credential!, scopes: (e.target as HTMLInputElement).value.split('\n') }, hasUnsavedChanges: true }));
					}}
				/>
				<p>
					<vscode-button title="Fetch a new Microsoft authentication token" onClick={() => onFetchMicrosoftCredential(endpoint.id, state.microsoftCredential?.scopes ?? [])}>
						Get Token
					</vscode-button>
				</p>
			</vscode-form-group>
		);
	};

	const renderEntraClientCredentialsFields = () => {
		const credential = state.entraClientCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Tenant ID</vscode-label>
				<vscode-textfield
					value={credential?.tenantId ?? ''}
					placeholder="00000000-0000-0000-0000-000000000000"
					label="Tenant ID"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, entraClientCredential: { ...credential, tenantId: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Client ID</vscode-label>
				<vscode-textfield
					value={credential?.clientId ?? ''}
					placeholder="00000000-0000-0000-0000-000000000000"
					label="Client ID"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, entraClientCredential: { ...credential, clientId: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				/>
				<vscode-label>Client Secret</vscode-label>
				<vscode-textfield
					value={credential?.clientSecret ?? ''}
					placeholder="Client Secret"
					label="Client Secret"
					type={state.passwordVisible ? 'text' : 'password'}
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({ ...prev, entraClientCredential: { ...credential, clientSecret: (e.target as HTMLInputElement).value }, hasUnsavedChanges: true }));
					}}
				>
					<vscode-icon
						slot="content-after"
						name={state.passwordVisible ? 'eye-closed' : 'eye'}
						title="Toggle visibility"
						action-icon
						onClick={() => setState(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
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
						setState(prev => ({ ...prev, entraClientCredential: { ...credential, scopes: (e.target as HTMLInputElement).value.split('\n').filter(s => s.trim()) }, hasUnsavedChanges: true }));
					}}
				/>
			</vscode-form-group>
		);
	};

	return (
		<div className="modal-form sparql-connection-view-container">
			{isTesting && <vscode-progress-bar />}
			<form onSubmit={handleFormSubmit}>
				{hideHeader && headerActionsSlot ? (
					createPortal(renderFormActions(), headerActionsSlot)
				) : hideHeader ? (
					<vscode-toolbar-container className="form-toolbar">
						{renderFormActions()}
					</vscode-toolbar-container>
				) : (
					<section>
						<div className="form-header">
							{onBack && (
								<vscode-toolbar-button title="Back to connections" onClick={(e: React.MouseEvent) => { e.preventDefault(); onBack(); }}>
									<vscode-icon name="arrow-left" />
								</vscode-toolbar-button>
							)}
							<h2>Edit Connection</h2>
							{renderFormActions()}
						</div>
					</section>
				)}
				<div className="form-body">
					<vscode-tabs ref={tabsRef} selectedIndex={state.activeTabIndex}>
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
										>
											{!wasConnectionTested() && <vscode-icon slot="content-before" name="database" />}
											{isTesting && <vscode-icon slot="content-before" name="ellipsis" className="icon-testing" />}
											{hasConnectionError() && <vscode-icon slot="content-before" name="error" className="icon-error" />}
											{isConnectionSuccessful() && <vscode-icon slot="content-before" name="pass" className="icon-success" />}
										</vscode-textfield>
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
								{!isWorkspaceStore && storeConfigs.length > 0 && (
									<div className="section-store-type">
										<vscode-label>Store Type</vscode-label>
										<vscode-single-select
											className="wide"
											ref={storeTypeSelectRef}
											value={selectedStoreType}
											disabled={isFormReadOnly()}>
											{storeConfigs.map(s => (
												<vscode-option key={s.id} value={s.id}>{s.label}</vscode-option>
											))}
										</vscode-single-select>
									</div>
								)}
							</section>
							{inferenceSupported && (
								<section>
									<div className="inference-toggle-container">
										<vscode-label>Reasoning</vscode-label>
										<vscode-checkbox
											checked={endpoint.inferenceEnabled ?? false}
											onChange={() => {
												setState(prev => ({ ...prev, endpoint: { ...prev.endpoint, inferenceEnabled: !prev.endpoint.inferenceEnabled } }));
												onToggleInference(endpoint.id);
											}}>
											Include inferred triples in query results
										</vscode-checkbox>
									</div>
								</section>
							)}
						</vscode-tab-panel>
						<vscode-tab-header slot="header">Authentication</vscode-tab-header>
						<vscode-tab-panel>
							<section className="auth">
								<div className="column-1">
									<vscode-label>Authentication Type</vscode-label>
									<vscode-single-select
										className="wide"
										ref={authTypeSelectRef}
										value={state.selectedAuthTypeIndex.toString()}
										disabled={isFormReadOnly()}>
										<vscode-option value="0">None</vscode-option>
										<vscode-option value="1">HTTP Basic</vscode-option>
										<vscode-option value="2">HTTP Bearer</vscode-option>
										<vscode-option value="3">Entra SSO</vscode-option>
										<vscode-option value="4">Entra Client Credentials</vscode-option>
									</vscode-single-select>
								</div>
								{state.selectedAuthTypeIndex !== AuthTypeIndex.None && (
									<div className="vertical-separator">
										{state.selectedAuthTypeIndex === AuthTypeIndex.Basic && renderBasicAuthFields()}
										{state.selectedAuthTypeIndex === AuthTypeIndex.Bearer && renderBearerAuthFields()}
										{state.selectedAuthTypeIndex === AuthTypeIndex.Microsoft && renderMicrosoftAuthFields()}
										{state.selectedAuthTypeIndex === AuthTypeIndex.EntraClientCredentials && renderEntraClientCredentialsFields()}
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