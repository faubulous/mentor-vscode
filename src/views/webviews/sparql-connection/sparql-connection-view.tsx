import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { useState, useCallback } from 'react';
import { VscodeSingleSelect, VscodeTabs } from '@vscode-elements/elements';
import { useWebviewMessaging, useStylesheet, useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { SparqlConnectionMessages } from './sparql-connection-messages';
import { SparqlConnection } from '@src/services/sparql-connection';
import { AuthCredential, BasicAuthCredential, BearerAuthCredential, MicrosoftAuthCredential } from '@src/services/credential';
import { CredentialFactory } from '@src/services/credential-factory';
import { HttpStatusCodes } from '@src/utilities/http-status-codes';
import { ConfigurationScope, getConfigurationScopeDescription } from '@src/utilities/config-scope';
import stylesheet from './sparql-connection-view.css';

enum AuthTypeIndex {
	None = 0,
	Basic = 1,
	Bearer = 2,
	Microsoft = 3
}

interface SparqlConnectionViewState {
	isChecking: boolean;
	connectionError?: { code: number; message: string } | null;
	hasUnsavedChanges: boolean;
	endpoint: SparqlConnection;
	selectedAuthTypeIndex: AuthTypeIndex;
	basicCredential: BasicAuthCredential;
	bearerCredential: BearerAuthCredential;
	microsoftCredential: MicrosoftAuthCredential;
	passwordVisible: boolean;
}

const initialState: SparqlConnectionViewState = {
	isChecking: false,
	connectionError: undefined,
	hasUnsavedChanges: false,
	endpoint: { id: 'new', endpointUrl: 'https://', configScope: 1 },
	selectedAuthTypeIndex: AuthTypeIndex.None,
	basicCredential: CredentialFactory.createBasicAuthCredential(),
	bearerCredential: CredentialFactory.createBearerAuthCredential(),
	microsoftCredential: CredentialFactory.createMicrosoftAuthCredential(),
	passwordVisible: false
};

/**
 * Component to edit SPARQL endpoint settings, e.g. endpoint URL and authentication.
 */
function SparqlConnectionView() {
	const [state, setState] = useState<SparqlConnectionViewState>(initialState);

	// Message handler
	const handleMessage = useCallback((message: SparqlConnectionMessages) => {
		switch (message.id) {
			case 'GetSparqlConnectionResult': {
				setState(prev => ({
					...prev,
					endpoint: message.connection,
					selectedAuthTypeIndex: AuthTypeIndex.None,
					basicCredential: CredentialFactory.createBasicAuthCredential(),
					bearerCredential: CredentialFactory.createBearerAuthCredential(),
					microsoftCredential: CredentialFactory.createMicrosoftAuthCredential(),
					isChecking: false,
					connectionError: undefined,
					hasUnsavedChanges: false
				}));

				messaging?.postMessage({
					id: 'GetSparqlConnectionCredential',
					connectionId: message.connection.id
				});
				return;
			}
			case 'GetSparqlConnectionCredentialResult': {
				const credential = message.credential;

				if (!credential) {
					setState(prev => ({ ...prev, selectedAuthTypeIndex: AuthTypeIndex.None }));
				} else if (credential.type === 'basic') {
					setState(prev => ({
						...prev,
						selectedAuthTypeIndex: AuthTypeIndex.Basic,
						basicCredential: message.credential as BasicAuthCredential
					}));
				} else if (credential.type === 'bearer') {
					setState(prev => ({
						...prev,
						selectedAuthTypeIndex: AuthTypeIndex.Bearer,
						bearerCredential: message.credential as BearerAuthCredential
					}));
				} else if (credential.type === 'microsoft') {
					setState(prev => ({
						...prev,
						selectedAuthTypeIndex: AuthTypeIndex.Microsoft,
						microsoftCredential: message.credential as MicrosoftAuthCredential
					}));
				}
				return;
			}
			case 'FetchMicrosoftAuthCredentialResult': {
				if (message.credential) {
					setState(prev => ({
						...prev,
						selectedAuthTypeIndex: AuthTypeIndex.Microsoft,
						microsoftCredential: message.credential!,
						hasUnsavedChanges: true
					}));
				}
				return;
			}
			case 'TestSparqlConnectionResult': {
				setState(prev => ({
					...prev,
					isChecking: false,
					connectionError: message.error
				}));
				return;
			}
		}
	}, []);

	const messaging = useWebviewMessaging<SparqlConnectionMessages>(handleMessage);

	// Add stylesheet
	useStylesheet('sparql-connection-styles', stylesheet);

	// Request initial connection on mount
	React.useEffect(() => {
		messaging?.postMessage({ id: 'GetSparqlConnection' });
	}, []);

	// Refs for vscode-elements with event handlers
	const configScopeTabsRef = useVscodeElementRef<VscodeTabs, { selectedIndex: number }>(
		'vsc-tabs-select',
		(element, _event) => {
			const newConfigScope = element.selectedIndex + 1;
			setState(prev => {
				const endpoint = { ...prev.endpoint, configScope: newConfigScope };
				messaging?.postMessage({
					id: 'UpdateSparqlConnection',
					connection: endpoint
				});
				return { ...prev, endpoint, hasUnsavedChanges: true };
			});
		}
	);

	const authTypeSelectRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element, _event) => {
			const value = parseInt(element.value, 10);
			setState(prev => ({
				...prev,
				selectedAuthTypeIndex: value,
				hasUnsavedChanges: true
			}));
		}
	);

	// Helper functions
	const isFormValid = () => state.endpoint.endpointUrl.trim().length > 0;
	const isFormReadOnly = () => state.endpoint.isProtected === true;
	const wasConnectionTested = () => isConnectionTesting() || isConnectionSuccessful() || hasConnectionError();
	const isConnectionTesting = () => state.isChecking === true;
	const isConnectionSuccessful = () => state.connectionError === null;
	const hasConnectionError = () => state.connectionError !== null && state.connectionError !== undefined;

	const getSelectedCredentialOrNull = (): AuthCredential | null => {
		switch (state.selectedAuthTypeIndex) {
			case AuthTypeIndex.Basic:
				return state.basicCredential;
			case AuthTypeIndex.Bearer:
				return state.bearerCredential;
			case AuthTypeIndex.Microsoft:
				return state.microsoftCredential;
			default:
				return null;
		}
	};

	const getEndpointSectionClassName = () => {
		const result = ['section-endpoint-url', 'row'];

		if (isFormReadOnly()) {
			result.push('readonly');
		}

		if (isConnectionTesting()) {
			result.push('status-testing');
		}

		if (state.connectionError) {
			result.push('status-error');
		} else if (state.connectionError === null) {
			result.push('status-success');
		}

		return result.join(' ');
	};

	// Event handlers
	const handleEndpointUrlChange = (e: React.FormEvent<HTMLElement>) => {
		const value = (e.target as HTMLInputElement).value;
		setState(prev => {
			const endpoint = { ...prev.endpoint, isModified: true, endpointUrl: value };
			messaging?.postMessage({
				id: 'UpdateSparqlConnection',
				connection: endpoint
			});
			return { ...prev, endpoint, hasUnsavedChanges: true };
		});
	};

	const handleSaveEndpoint = (e: React.FormEvent) => {
		e.preventDefault();

		messaging?.postMessage({
			id: 'SaveSparqlConnection',
			connection: state.endpoint,
			credential: getSelectedCredentialOrNull()
		});

		setState(prev => ({ ...prev, hasUnsavedChanges: false }));
	};

	const handleTestEndpoint = (e: React.MouseEvent) => {
		e.preventDefault();

		setState(prev => ({ ...prev, isChecking: true, connectionError: undefined }));

		messaging?.postMessage({
			id: 'TestSparqlConnection',
			connection: state.endpoint,
			credential: getSelectedCredentialOrNull()
		});
	};

	const handleDeleteEndpoint = (e: React.MouseEvent) => {
		e.preventDefault();

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.deleteSparqlConnection',
			args: [state.endpoint]
		});
	};

	// Render helpers
	const renderConnectionTestErrorMessage = (connectionError: { code: number; message: string }) => {
		if (connectionError.code === 0) {
			return (
				<div>
					<p>The host could not be reached. Possible causes include:</p>
					<ul>
						<li>Incorrect endpoint URL</li>
						<li>The endpoint is unavailable</li>
						<li>Failing CORS preflight request</li>
						<li>Firewall or network policy is blocking the request</li>
					</ul>
				</div>
			);
		} else {
			return (
				<div>
					<h4>Error {connectionError.code} - {HttpStatusCodes[connectionError.code].message}</h4>
					<p>{connectionError.message}</p>
				</div>
			);
		}
	};

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
						const updatedCredential = {
							...credential!,
							username: (e.target as HTMLInputElement).value
						};
						setState(prev => ({
							...prev,
							basicCredential: updatedCredential,
							hasUnsavedChanges: true
						}));
					}}
				/>
				<vscode-label>Password</vscode-label>
				<vscode-textfield
					value={credential?.password ?? ''}
					label="Password"
					type={state.passwordVisible ? 'text' : 'password'}
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						const updatedCredential = {
							...credential!,
							password: (e.target as HTMLInputElement).value
						};
						setState(prev => ({
							...prev,
							basicCredential: updatedCredential,
							hasUnsavedChanges: true
						}));
					}}
				>
					<vscode-icon
						slot="content-after"
						name={state.passwordVisible ? 'eye-closed' : 'eye'}
						title="clear-all"
						action-icon
						onClick={() => setState(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
					></vscode-icon>
				</vscode-textfield>
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
						const updatedCredential = {
							...credential!,
							scopes: (e.target as HTMLInputElement).value.split('\n')
						};
						setState(prev => ({
							...prev,
							microsoftCredential: updatedCredential,
							hasUnsavedChanges: true
						}));
					}}
				/>
				<vscode-button onClick={() => {
					const scopes = state.microsoftCredential?.scopes;
					messaging?.postMessage({
						id: 'FetchMicrosoftAuthCredential',
						connectionId: state.endpoint.id,
						scopes: scopes
					});
				}}>
					Get Token
				</vscode-button>
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
						setState(prev => ({
							...prev,
							bearerCredential: {
								...credential,
								prefix: (e.target as HTMLInputElement).value
							},
							hasUnsavedChanges: true
						}));
					}}
				/>
				<vscode-label>Token</vscode-label>
				<vscode-textarea
					value={credential?.token ?? ''}
					placeholder="Token"
					label="Token"
					disabled={isFormReadOnly()}
					onInput={(e: React.FormEvent<HTMLElement>) => {
						setState(prev => ({
							...prev,
							bearerCredential: {
								...credential,
								token: (e.target as HTMLInputElement).value
							},
							hasUnsavedChanges: true
						}));
					}}
				/>
			</vscode-form-group>
		);
	};

	const endpoint = state.endpoint;

	if (!endpoint) {
		return <div>Loading...</div>;
	}

	const connectionError = state.connectionError;

	return (
		<div className="sparql-connection-view-container">
			{isConnectionTesting() && <vscode-progress-bar />}
			<form onSubmit={handleSaveEndpoint}>
				<section>
					<div className="form-header">
						<div className="form-title">
							<h2>SPARQL Connection</h2>
						</div>
						{isFormReadOnly() && <div className="form-read-only">
							<vscode-icon name="lock" /><span>This connection cannot be edited.</span>
						</div>}
						{!isFormReadOnly() && <div className="form-buttons">
							<vscode-toolbar-button
								onClick={handleDeleteEndpoint}>
								<vscode-icon
									name="trash"
									title="Delete"
								></vscode-icon>
							</vscode-toolbar-button>
							<vscode-button
								type="submit"
								disabled={!isFormValid() || !state.hasUnsavedChanges}>
								Save
							</vscode-button>
						</div>}
					</div>
					<vscode-tabs ref={configScopeTabsRef} selected-index={endpoint.configScope - 1}>
						<vscode-tab-header title={getConfigurationScopeDescription(ConfigurationScope.User)}>User</vscode-tab-header>
						<vscode-tab-header title={getConfigurationScopeDescription(ConfigurationScope.Workspace)}>Workspace</vscode-tab-header>
					</vscode-tabs>
				</section>
				<section>
					<div className={getEndpointSectionClassName()}>
						<vscode-textfield
							required
							value={endpoint.endpointUrl}
							title='Endpoint URL'
							placeholder="https://example.org/sparql"
							disabled={isFormReadOnly()}
							onInput={handleEndpointUrlChange}
						>
							{!wasConnectionTested() && <vscode-icon
								slot="content-before"
								name="database"
							></vscode-icon>}
							{isConnectionTesting() && <vscode-icon
								slot="content-before"
								name="ellipsis"
								className="icon-testing"
							></vscode-icon>}
							{hasConnectionError() && <vscode-icon
								slot="content-before"
								name="error"
								className="icon-error"
							></vscode-icon>}
							{isConnectionSuccessful() && <vscode-icon
								slot="content-before"
								name="pass"
								className="icon-success"
							></vscode-icon>}
						</vscode-textfield>
						<vscode-button
							type="button"
							icon="debug-disconnect"
							title="Test Connection"
							disabled={!isFormValid() || isFormReadOnly() || isConnectionTesting()}
							onClick={handleTestEndpoint}>
						</vscode-button>
					</div>
					{connectionError && <div className='section-endpoint-status status-error'>
						{renderConnectionTestErrorMessage(connectionError)}
					</div>}
				</section>
				<section>
					<vscode-label>Authentication</vscode-label>
					<vscode-form-helper>
						Select the authentication method to use when connecting to the SPARQL endpoint:
					</vscode-form-helper>
					<div className="section-authentication-container">
						<div className="column-1">
							<vscode-label>Type</vscode-label>
							<vscode-single-select
								ref={authTypeSelectRef}
								value={state.selectedAuthTypeIndex.toString()}
								disabled={isFormReadOnly()}>
								<vscode-option value="0">None</vscode-option>
								<vscode-option value="1">Basic</vscode-option>
								<vscode-option value="2">Bearer</vscode-option>
								<vscode-option value="3">Microsoft Entra</vscode-option>
							</vscode-single-select>
						</div>
						{state.selectedAuthTypeIndex !== AuthTypeIndex.None && <div className="vertical-separator">
							{state.selectedAuthTypeIndex === AuthTypeIndex.Basic && renderBasicAuthFields()}
							{state.selectedAuthTypeIndex === AuthTypeIndex.Bearer && renderBearerAuthFields()}
							{state.selectedAuthTypeIndex === AuthTypeIndex.Microsoft && renderMicrosoftAuthFields()}
						</div>}
					</div>
				</section>
			</form>
		</div>
	);
}

export { SparqlConnectionView };

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlConnectionView />);