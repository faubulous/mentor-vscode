import { createRoot } from 'react-dom/client';
import { VscodeSingleSelect, VscodeTabs } from '@vscode-elements/elements';
import { WebviewHost } from '@src/views/webviews/webview-host';
import { WebviewComponent } from '@src/views/webviews/webview-component';
import { SparqlConnectionMessages } from './sparql-connection-messages';
import { SparqlConnection } from '@src/services/sparql-connection';
import { AuthCredential, BasicAuthCredential, BearerAuthCredential } from '@src/services/credential';
import { HttpStatusCodes } from '@src/utilities/http-status-codes';
import stylesheet from './sparql-connection-view.css';
import { ConfigurationScope, getConfigurationScopeDescription } from '@src/utilities/config-scope';

enum AuthTabIndex {
	None = 0,
	Basic = 1,
	Bearer = 2
}

interface SparqlConnectionViewState {
	isChecking?: boolean;

	connectionError?: { code: number; message: string } | null | undefined;

	hasUnsavedChanges: boolean;

	endpoint: SparqlConnection;

	selectedAuthTabIndex: AuthTabIndex;

	basicCredential: BasicAuthCredential;

	bearerCredential: BearerAuthCredential;

	passwordVisible?: boolean;
}

/**
 * Component to edit SPARQL endpoint settings, e.g. endpoint URL and authentication.
 */
export class SparqlConnectionView extends WebviewComponent<
	{},
	SparqlConnectionViewState,
	SparqlConnectionMessages
> {
	messaging = WebviewHost.getMessaging<SparqlConnectionMessages>();

	private _authTabs: VscodeTabs | null = null;

	protected setAuthTabsRef = (element: VscodeTabs | null) => {
		if (this._authTabs) {
			this._authTabs.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}

		this._authTabs = element;

		if (element) {
			element.addEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}
	};

	private _configScopeTabs: VscodeTabs | null = null;

	protected setConfigScopeRef = (element: VscodeTabs | null) => {
		if (this._configScopeTabs) {
			this._configScopeTabs.removeEventListener('vsc-tabs-select', this._handleConfigScopeChange);
		}

		this._configScopeTabs = element;

		if (element) {
			element.addEventListener('vsc-tabs-select', this._handleConfigScopeChange);
		}
	};

	private _authTypeSelect: VscodeSingleSelect | null = null;

	protected setAuthTypeSelectRef = (element: VscodeSingleSelect | null) => {
		if (this._authTypeSelect) {
			this._authTypeSelect.removeEventListener('change', this._handleAuthTabChange);
		}
		
		this._authTypeSelect = element;

		if (element) {
			element.addEventListener('change', (e: any) => {
				const value = parseInt(e.target.value, 10);

				this.setState({ selectedAuthTabIndex: value });
			});
		}
	}

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('sparql-connection-styles', stylesheet);

		this.setState({
			endpoint: { id: 'new', endpointUrl: 'https://', configScope: 1 },
			selectedAuthTabIndex: 0,
			basicCredential: { type: 'basic', username: '', password: '' },
			bearerCredential: { type: 'bearer', prefix: 'Bearer', token: '' },
			isChecking: false,
			connectionError: undefined
		});

		this.messaging.postMessage({ id: 'GetSparqlConnection' });
	}

	componentWillUnmount(): void {
		if (this._authTabs) {
			this._authTabs.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}

		if (this._configScopeTabs) {
			this._configScopeTabs.removeEventListener('change', this._handleConfigScopeChange);
		}
	}

	override componentDidReceiveMessage(message: SparqlConnectionMessages) {
		switch (message.id) {
			case 'GetSparqlConnectionResult': {
				this.setState({
					endpoint: message.connection,
					selectedAuthTabIndex: 0,
					basicCredential: { type: 'basic', username: '', password: '' },
					bearerCredential: { type: 'bearer', prefix: 'Bearer', token: '' },
					isChecking: false,
					connectionError: undefined,
					hasUnsavedChanges: false
				});

				this.messaging.postMessage({
					id: 'GetSparqlConnectionCredential',
					connectionId: message.connection.id
				});
				return;
			}
			case 'GetSparqlConnectionCredentialResult': {
				const credential = message.credential;

				if (!credential) {
					this.setState({ selectedAuthTabIndex: 0 });
					return;
				}

				if (credential.type === 'basic') {
					this.setState({
						selectedAuthTabIndex: 1,
						basicCredential: {
							type: 'basic',
							username: credential.username ?? '',
							password: credential.password ?? ''
						}
					});
				} else if (credential.type === 'bearer') {
					this.setState({
						selectedAuthTabIndex: 2,
						bearerCredential: {
							type: 'bearer',
							prefix: credential.prefix ?? 'Bearer',
							token: credential.token ?? ''
						}
					});
				}
				return;
			}
			case 'TestSparqlConnectionResult': {
				this.setState({
					isChecking: false,
					connectionError: message.error
				});
				return;
			}
		}
	}

	render() {
		const endpoint: SparqlConnection = this.state?.endpoint;

		if (!endpoint) {
			return <div>Loading...</div>;
		}

		const connectionError = this.state?.connectionError;

		return (
			<div className="sparql-connection-view-container">
				{this._isConnectionTesting() && <vscode-progress-bar />}
				<form onSubmit={(e) => this._handleSaveEndpoint(e)}>
					<section>
						<div className="form-header">
							<div className="form-title">
								<h2>SPARQL Connection</h2>
							</div>
							{this._isFormReadOnly() && <div className="form-read-only">
								<vscode-icon name="lock" /><span>This connection cannot be edited.</span>
							</div>}
							{!this._isFormReadOnly() && <div className="form-buttons">
								<vscode-toolbar-button
									onClick={(e) => this._handleDeleteEndpoint(e)}>
									<vscode-icon
										name="trash"
										title="Delete"
									></vscode-icon>
								</vscode-toolbar-button>
								<vscode-button
									type="submit"
									disabled={!this._isFormValid() || !this.state.hasUnsavedChanges}>
									Save
								</vscode-button>
							</div>}
						</div>
						<vscode-tabs ref={this.setConfigScopeRef} selected-index={endpoint.configScope - 1}>
							<vscode-tab-header title={getConfigurationScopeDescription(ConfigurationScope.User)}>User</vscode-tab-header>
							<vscode-tab-header title={getConfigurationScopeDescription(ConfigurationScope.Workspace)}>Workspace</vscode-tab-header>
						</vscode-tabs>
					</section>
					<section>
						<div className={this._getEndpointSectionClassName()}>
							<vscode-textfield
								required
								value={endpoint.endpointUrl}
								title='Endpoint URL'
								placeholder="https://example.org/sparql"
								disabled={this._isFormReadOnly()}
								onInput={e => this._handleEndpointUrlChange(e)}
							>
								{!this._wasConnectionTested() && <vscode-icon
									slot="content-before"
									name="database"
								></vscode-icon>}
								{this._isConnectionTesting() && <vscode-icon
									slot="content-before"
									name="ellipsis"
									className="icon-testing"
								></vscode-icon>}
								{this._hasConnectionError() && <vscode-icon
									slot="content-before"
									name="error"
									className="icon-error"
								></vscode-icon>}
								{this._isConnectionSuccessful() && <vscode-icon
									slot="content-before"
									name="pass"
									className="icon-success"
								></vscode-icon>}
							</vscode-textfield>
							<vscode-button
								type="button"
								icon="debug-disconnect"
								title="Test Connection"
								disabled={!this._isFormValid() || this._isFormReadOnly() || this._isConnectionTesting()}
								onClick={(e) => this._handleTestEndpoint(e)}>
							</vscode-button>
						</div>
						{connectionError && <div className='section-endpoint-status status-error'>
							{this._renderConnectionTestErrorMessage(connectionError)}
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
									ref={this.setAuthTypeSelectRef}
									value={this.state.selectedAuthTabIndex.toString()}
									disabled={this._isFormReadOnly()}>
									<vscode-option value="0">None</vscode-option>
									<vscode-option value="1">Basic</vscode-option>
									<vscode-option value="2">Bearer</vscode-option>
								</vscode-single-select>
							</div>
							{this.state.selectedAuthTabIndex !== 0 && <div className="vertical-separator">
								{this.state.selectedAuthTabIndex === 1 && this._renderBasicAuthFields()}
								{this.state.selectedAuthTabIndex === 2 && this._renderBearerAuthFields()}
							</div>}
						</div>
					</section>
				</form>
			</div>
		);
	}

	private _isFormValid() {
		return this.state?.endpoint.endpointUrl.trim().length > 0;
	}

	private _isFormReadOnly() {
		return this.state?.endpoint.isProtected === true;
	}

	private _wasConnectionTested() {
		return this._isConnectionTesting() ||
			this._isConnectionSuccessful() ||
			this._hasConnectionError();
	}

	private _isConnectionTesting() {
		return this.state?.isChecking === true;
	}

	private _isConnectionSuccessful() {
		return this.state?.connectionError === null;
	}

	private _hasConnectionError() {
		return this.state?.connectionError !== null && this.state?.connectionError !== undefined;
	}

	private _getSelectedCredentialOrNull(): AuthCredential | null {
		switch (this.state.selectedAuthTabIndex) {
			case 1:
				return this.state.basicCredential;
			case 2:
				return this.state.bearerCredential;
			default:
				return null;
		}
	}

	private _getEndpointSectionClassName() {
		const result = ['section-endpoint-url', 'row'];

		if (this._isFormReadOnly()) {
			result.push('readonly');
		}

		if (this._isConnectionTesting()) {
			result.push('status-testing');
		}

		if (this.state?.connectionError) {
			result.push('status-error');
		} else if (this.state?.connectionError === null) {
			result.push('status-success');
		}

		return result.join(' ');
	}

	private _renderBasicAuthFields() {
		const credential = this.state?.basicCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Username</vscode-label>
				<vscode-textfield
					value={credential?.username ?? ''}
					placeholder="myuser"
					label="Username"
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const updatedCredential = {
							...credential!,
							username: (e.target as HTMLInputElement).value
						};
						this.setState({ basicCredential: updatedCredential });
					}}
				/>
				<vscode-label>Password</vscode-label>
				<vscode-textfield
					value={credential?.password ?? ''}
					label="Password"
					type={this.state.passwordVisible ? 'text' : 'password'}
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const updatedCredential = {
							...credential!,
							password: (e.target as HTMLInputElement).value
						};
						this.setState({ basicCredential: updatedCredential });
					}}
				>
					<vscode-icon
						slot="content-after"
						name={this.state.passwordVisible ? 'eye-closed' : 'eye'}
						title="clear-all"
						action-icon
						onClick={() => this.setState({ passwordVisible: !this.state.passwordVisible })}
					></vscode-icon>
				</vscode-textfield>
			</vscode-form-group>
		);
	}

	private _renderConnectionTestErrorMessage(connectionError: any) {
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
			)
		} else if (connectionError.code !== 0) {
			return (
				<div>
					<h4>Error {connectionError.code} - {HttpStatusCodes[connectionError.code].message}</h4>
					<p>{connectionError.message}</p>
				</div>
			)
		}
	}

	private _renderBearerAuthFields() {
		const credential = this.state?.bearerCredential;

		return (
			<vscode-form-group variant='vertical'>
				<vscode-label>Token Prefix</vscode-label>
				<vscode-textfield
					value={credential?.prefix ?? ''}
					placeholder="Bearer"
					label="Token Prefix"
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const value = (e.target as HTMLInputElement).value;

						this.setState({
							bearerCredential: {
								...credential,
								prefix: value
							}
						});
					}}
				/>
				<vscode-label>Token</vscode-label>
				<vscode-textarea
					value={credential?.token ?? ''}
					placeholder="Token"
					label="Token"
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const value = (e.target as HTMLInputElement).value;

						this.setState({
							bearerCredential: {
								...credential,
								token: value
							}
						});
					}}
				/>
			</vscode-form-group>
		);
	}

	private _handleEndpointUrlChange(e: any) {
		this.state.endpoint.isModified = true;
		this.state.endpoint.endpointUrl = (e.target as HTMLInputElement).value;

		this.setState({ ...this.state, hasUnsavedChanges: true });

		this.messaging.postMessage({
			id: 'UpdateSparqlConnection',
			connection: this.state.endpoint
		});
	}

	private _handleConfigScopeChange = (e: any) => {
		if (this._configScopeTabs) {
			const endpoint = this.state.endpoint;
			endpoint.configScope = this._configScopeTabs.selectedIndex + 1;

			this.setState({ endpoint, hasUnsavedChanges: true });

			this.messaging.postMessage({
				id: 'UpdateSparqlConnection',
				connection: this.state.endpoint
			});
		}
	}

	private _handleAuthTabChange = (event: any) => {
		if (this._authTabs) {
			const i = this._authTabs.selectedIndex ?? AuthTabIndex.None;

			this.setState({ selectedAuthTabIndex: i });
		}
	};

	private _handleSaveEndpoint(e: any) {
		e.preventDefault();

		this.messaging.postMessage({
			id: 'SaveSparqlConnection',
			connection: this.state.endpoint,
			credential: this._getSelectedCredentialOrNull()
		});

		this.setState({ hasUnsavedChanges: false });
	}

	private _handleTestEndpoint(e: any) {
		e.preventDefault();

		this.setState({ isChecking: true, connectionError: undefined });

		this.messaging.postMessage({
			id: 'TestSparqlConnection',
			connection: this.state.endpoint,
			credential: this._getSelectedCredentialOrNull()
		});
	}

	private _handleDeleteEndpoint(e: any) {
		e.preventDefault();

		this._executeCommand('mentor.command.deleteSparqlConnection', this.state.endpoint);
	}

	private _executeCommand(command: string, ...args: any[]) {
		this.messaging.postMessage({ id: 'ExecuteCommand', command, args });
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlConnectionView />);