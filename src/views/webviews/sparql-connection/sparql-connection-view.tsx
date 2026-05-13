import * as React from 'react';
import { useState, useEffect } from 'react';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { useStylesheet, useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import {
	AuthCredential,
	BasicAuthCredential,
	BearerAuthCredential,
	EntraClientAuthCredential,
	MicrosoftAuthCredential
} from '@src/services/core/credential';
import { CredentialFactory } from '@src/services/core/credential-factory';
import { ConfigurationScope, getConfigurationScopeDescription } from '@src/utilities/config-scope';
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
	};
}

export interface SparqlConnectionViewProps {
	connection: SparqlConnection;
	/** Loaded credential from storage. undefined = loading, null = no credential. */
	initialCredential?: AuthCredential | null;
	/** Test result. undefined = not tested, null = success, error object = failure. */
	testResult?: { code: number; message: string } | null;
	isTesting: boolean;
	inferenceEnabled: boolean;
	/** A freshly fetched Microsoft token; when non-null, replaces the Microsoft credential fields. */
	fetchedMicrosoftCredential?: MicrosoftAuthCredential | null;
	/** Optional back button, used when embedded inside a larger view. */
	onBack?: () => void;
	/** Called after a successful save, e.g. to navigate back. Only used in embedded contexts. */
	onSaved?: () => void;
	onSave(connection: SparqlConnection, credential: AuthCredential | null): void;
	onUpdate(connection: SparqlConnection): void;
	onDelete(connection: SparqlConnection): void;
	onRequestTest(connection: SparqlConnection, credential: AuthCredential | null): void;
	onRequestCredential(connectionId: string): void;
	onRequestInferenceEnabled(): void;
	onToggleInference(connectionId: string): void;
	onFetchMicrosoftCredential(connectionId: string, scopes: string[]): void;
}

export function SparqlConnectionView(props: SparqlConnectionViewProps) {
	const {
		connection, initialCredential, testResult, isTesting, inferenceEnabled, fetchedMicrosoftCredential,
		onBack, onSaved, onSave, onUpdate, onDelete, onRequestTest,
		onRequestCredential, onRequestInferenceEnabled, onToggleInference, onFetchMicrosoftCredential,
	} = props;

	const [state, setState] = useState<FormState>(() => makeInitialFormState(connection));

	useStylesheet('sparql-connection-view-styles', stylesheet);

	// Reset form and reload data when a different connection is shown.
	useEffect(() => {
		setState(makeInitialFormState(connection));
		onRequestCredential(connection.id);
		onRequestInferenceEnabled();
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
		if (!fetchedMicrosoftCredential) return;
		setState(prev => ({
			...prev,
			selectedAuthTypeIndex: AuthTypeIndex.Microsoft,
			microsoftCredential: fetchedMicrosoftCredential,
			hasUnsavedChanges: true,
		}));
	}, [fetchedMicrosoftCredential]);

	const configScopeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		const newConfigScope = parseInt(element.value, 10);
		setState(prev => {
			const endpoint = { ...prev.endpoint, configScope: newConfigScope };
			onUpdate(endpoint);
			return { ...prev, endpoint, hasUnsavedChanges: true };
		});
	});

	const authTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => {
		setState(prev => ({ ...prev, selectedAuthTypeIndex: parseInt(element.value, 10), hasUnsavedChanges: true }));
	});

	const isFormReadOnly = () => state.endpoint.isProtected === true;
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
		const cls = ['section-endpoint-url', 'row'];
		if (isFormReadOnly()) cls.push('readonly');
		if (isTesting) cls.push('status-testing');
		if (testResult) cls.push('status-error');
		else if (testResult === null) cls.push('status-success');
		return cls.join(' ');
	};

	const handleDescriptionChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;
		setState(prev => {
			const endpoint = { ...prev.endpoint, description: value || undefined };
			onUpdate(endpoint);
			return { ...prev, endpoint, hasUnsavedChanges: true };
		});
	};

	const handleEndpointUrlChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;
		setState(prev => {
			const endpoint = { ...prev.endpoint, isModified: true, endpointUrl: value };
			onUpdate(endpoint);
			return { ...prev, endpoint, hasUnsavedChanges: true };
		});
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(state.endpoint, getSelectedCredential());
		setState(prev => ({ ...prev, hasUnsavedChanges: false }));
		onSaved?.();
	};

	const handleTest = (e: React.MouseEvent) => {
		e.preventDefault();
		onRequestTest(state.endpoint, getSelectedCredential());
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.preventDefault();
		onDelete(state.endpoint);
		onBack?.();
	};

	const endpoint = state.endpoint;

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
				<vscode-button onClick={() => onFetchMicrosoftCredential(endpoint.id, state.microsoftCredential?.scopes ?? [])}>
					Get Token
				</vscode-button>
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
		<div className="sparql-connection-view-container">
			{isTesting && <vscode-progress-bar />}
			<form onSubmit={handleSave}>
				<section>
					<div className="form-header">
						<div className={`form-title${onBack ? ' form-back' : ''}`}>
							{onBack && (
								<vscode-toolbar-button title="Back to connections" onClick={(e: React.MouseEvent) => { e.preventDefault(); onBack(); }}>
									<vscode-icon name="arrow-left" />
								</vscode-toolbar-button>
							)}
							<h2>Edit Connection</h2>
						</div>
						<div className={`form-actions ${isFormReadOnly() ? 'readonly' : ''}`}>
							{isFormReadOnly() && <vscode-icon name="lock" />}
							{!isFormReadOnly() && <>
								<vscode-toolbar-button onClick={handleDelete}>
									<vscode-icon name="trash" title="Delete" />
								</vscode-toolbar-button>
								<vscode-single-select
									ref={configScopeSelectRef}
									value={endpoint.configScope.toString()}
									disabled={isFormReadOnly()}
									className="connection-scope-select">
									<vscode-option title={getConfigurationScopeDescription(ConfigurationScope.User)} value="1">User</vscode-option>
									<vscode-option title={getConfigurationScopeDescription(ConfigurationScope.Workspace)} value="2">Workspace</vscode-option>
								</vscode-single-select>
								<vscode-button type="submit" disabled={!isFormValid() || !state.hasUnsavedChanges}>
									Save
								</vscode-button>
							</>}
						</div>
					</div>
				</section>
				<div className="form-body">
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
								<vscode-button
									type="button"
									icon="debug-disconnect"
									title="Test Connection"
									disabled={!isFormValid() || isFormReadOnly() || isTesting}
									onClick={handleTest}
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
					</section>
					<section>
						<div>
							<span className='section-label'>Authentication</span>
							<vscode-form-helper>
								Select the authentication method to use when connecting to the SPARQL endpoint:
							</vscode-form-helper>
						</div>
						<div className="section-authentication-container">
							<div className="column-1">
								<vscode-label>Type</vscode-label>
								<vscode-single-select
									className="wide"
									ref={authTypeSelectRef}
									value={state.selectedAuthTypeIndex.toString()}
									disabled={isFormReadOnly()}>
									<vscode-option value="0">None</vscode-option>
									<vscode-option value="1">Basic</vscode-option>
									<vscode-option value="2">Bearer</vscode-option>
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
						</div>
					</section>
					{inferenceEnabled && endpoint.inferenceSupported && (
						<section>
							<div>
								<span className='section-label'>Inference</span>
								<vscode-form-helper>
									When enabled, inferred triples are included in query results.
								</vscode-form-helper>
							</div>
							<div className="inference-toggle-container">
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
				</div>
			</form>
		</div>
	);
}