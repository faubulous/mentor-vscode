import { createRoot } from 'react-dom/client';
import { VscodeSingleSelect, VscodeTabs } from '@vscode-elements/elements';
import { WebviewHost } from '@/webviews/webview-host';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlEndpoint, getConfigurationTargetLabel } from '@/services/sparql-endpoint';
import { Credential } from '@/services/credential-storage-service';
import stylesheet from './sparql-endpoint-view.css';

enum AuthTabIndex {
	None = 0,
	Basic = 1,
	Bearer = 2
}

interface SparqlEndpointViewState {
	isChecking?: boolean;

	connectionError?: { code: number; message: string } | null | undefined;

	hasUnsavedChanges: boolean;

	endpoint: SparqlEndpoint;

	selectedAuthTabIndex: AuthTabIndex;

	basicCredential: { type: 'basic'; username: string; password: string };

	bearerCredential: { type: 'bearer'; token: string };
}

/**
 * Component to edit SPARQL endpoint settings, e.g. endpoint URL and authentication.
 */
export class SparqlEndpointView extends WebviewComponent<
	{},
	SparqlEndpointViewState,
	SparqlEndpointMessages
> {
	messaging = WebviewHost.getMessaging<SparqlEndpointMessages>();

	private authTabs: VscodeTabs | null = null;

	private setAuthTabsRef = (element: VscodeTabs | null) => {
		if (this.authTabs) {
			this.authTabs.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}

		this.authTabs = element;

		if (element) {
			element.addEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}
	};

	private configTargetSelect: VscodeSingleSelect | null = null;

	private setConfigTargetRef = (element: VscodeSingleSelect | null) => {
		if (this.configTargetSelect) {
			this.configTargetSelect.removeEventListener('change', this._handleConfigTargetChange);
		}

		this.configTargetSelect = element;

		if (element) {
			element.addEventListener('change', this._handleConfigTargetChange);
		}
	};

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('sparql-endpoint-styles', stylesheet);

		this.setState({
			endpoint: { id: 'new', endpointUrl: '', configTarget: 1 },
			selectedAuthTabIndex: 0,
			basicCredential: { type: 'basic', username: '', password: '' },
			bearerCredential: { type: 'bearer', token: '' },
			isChecking: false,
			connectionError: undefined
		});
	}

	componentWillUnmount(): void {
		if (this.authTabs) {
			this.authTabs.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}

		if (this.configTargetSelect) {
			this.configTargetSelect.removeEventListener('change', this._handleConfigTargetChange);
		}
	}

	override componentDidReceiveMessage(message: SparqlEndpointMessages) {
		switch (message.id) {
			case 'EditSparqlEndpoint': {
				this.setState({
					endpoint: message.endpoint,
					selectedAuthTabIndex: 0,
					basicCredential: { type: 'basic', username: '', password: '' },
					bearerCredential: { type: 'bearer', token: '' },
					isChecking: false,
					connectionError: undefined
				});

				this.messaging.postMessage({
					id: 'GetSparqlEndpointCredential',
					endpointUrl: message.endpoint.endpointUrl
				});
				return;
			}
			case 'GetSparqlEndpointCredentialResult': {
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
							token: credential.token ?? ''
						}
					});
				}
				return;
			}
			case 'TestSparqlEndpointResult': {
				this.setState({
					isChecking: false,
					connectionError: message.error
				});
				return;
			}
		}
	}

	render() {
		const endpoint: SparqlEndpoint = this.state?.endpoint;

		if (!endpoint) {
			return <div>Loading...</div>;
		}

		const connectionError = this.state?.connectionError;

		return (
			<div className="sparql-endpoint-view-container">
				{this._isConnectionTesting() && <vscode-progress-bar />}
				<form onSubmit={(e) => this._handleSaveEndpoint(e)}>
					<div className="form-header">
						<div className="form-title">
							<h2>SPARQL Endpoint</h2>
						</div>
						<div className="form-buttons">
							<vscode-toolbar-button
								disabled={this._isFormReadOnly()}
								onClick={(e) => this._handleDeleteEndpoint(e)}>
								<vscode-icon
									action-icon
									name="trash"
									title="Delete"
								></vscode-icon>
							</vscode-toolbar-button>
							<vscode-button
								type="submit"
								disabled={!this._isFormValid() || this._isFormReadOnly()}>
								Save
							</vscode-button>
						</div>
					</div>
					<vscode-divider></vscode-divider>
					<vscode-form-group variant="vertical">
						<vscode-label>Endpoint URL</vscode-label>
						<div className={this._getEndpointSectionClassName()}>
							<vscode-textfield
								required
								value={endpoint.endpointUrl}
								placeholder="https://example.org/sparql"
								disabled={this._isFormReadOnly()}
								onInput={e => this._handleEndpointUrlChange(e)}
							>
								{this._isFormReadOnly() && <vscode-icon
									slot="content-after"
									name="lock"
									className="icon-readonly"
								></vscode-icon>}
								{this._isConnectionTesting() && <vscode-icon
									slot="content-after"
									name="ellipsis"
									className="icon-testing"
								></vscode-icon>}
								{this._hasConnectionError() && <vscode-icon
									slot="content-after"
									name="error"
									className="icon-error"
								></vscode-icon>}
								{this._isConnectionSuccessful() && <vscode-icon
									slot="content-after"
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
							{connectionError.code === 0 && this._renderConnectionTestErrorMessage()}
							{connectionError.code !== 0 && <h4>Error {connectionError.code}</h4>}
							{connectionError.code !== 0 && <p>connectionError.message</p>}
						</div>}
					</vscode-form-group>
					<vscode-form-group variant="vertical">
						<vscode-label>Configuration Scope</vscode-label>
						<vscode-single-select
							ref={this.setConfigTargetRef}
							value={String(endpoint.configTarget)}
							disabled={this._isFormReadOnly()}>
							<vscode-option value="1">User</vscode-option>
							<vscode-option value="2">Workspace</vscode-option>
						</vscode-single-select>
					</vscode-form-group>
					<vscode-form-group variant="vertical">
						<vscode-label>Authentication</vscode-label>
						<vscode-tabs
							ref={this.setAuthTabsRef}
							selectedIndex={this.state?.selectedAuthTabIndex ?? 0}>
							<vscode-tab-header id="none" slot="header">
								None
							</vscode-tab-header>
							<vscode-tab-panel>
								<span className="text-muted">No authentication</span>
							</vscode-tab-panel>
							<vscode-tab-header id="basic" slot="header">
								Basic
							</vscode-tab-header>
							<vscode-tab-panel>
								{this._renderBasicAuthFields()}
							</vscode-tab-panel>
							<vscode-tab-header id="bearer" slot="header">
								Bearer
							</vscode-tab-header>
							<vscode-tab-panel>
								{this._renderBearerAuthFields()}
							</vscode-tab-panel>
						</vscode-tabs>
					</vscode-form-group>
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

	private _isConnectionTesting() {
		return this.state?.isChecking === true;
	}

	private _isConnectionSuccessful() {
		return this.state?.connectionError === null;
	}

	private _hasConnectionError() {
		return this.state?.connectionError !== null && this.state?.connectionError !== undefined;
	}

	private _getSelectedCredentialOrNull(): Credential | null {
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
			<div className="column">
				<vscode-textfield
					value={credential?.username ?? ''}
					placeholder="Username"
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
				<vscode-textfield
					value={credential?.password ?? ''}
					placeholder="Password"
					label="Password"
					type="password"
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const updatedCredential = {
							...credential!,
							password: (e.target as HTMLInputElement).value
						};
						this.setState({ basicCredential: updatedCredential });
					}}
				/>
			</div>
		);
	}

	private _renderConnectionTestErrorMessage() {
		return (
			<div>
				<p>The host is unreachable. This might be for the following reasons:</p>
				<ul>
					<li>Incorrect endpoint URL</li>
					<li>Endpoint is offline</li>
					<li>Failing CORS preflight request</li>
					<li>Firewall blocking the request</li>
				</ul>
			</div>
		)
	}

	private _renderBearerAuthFields() {
		const credential = this.state?.bearerCredential;

		return (
			<div className="column">
				<vscode-textfield
					value={credential?.token ?? ''}
					placeholder="Token"
					label="Token"
					disabled={this._isFormReadOnly()}
					onInput={e => {
						const updatedCredential = {
							...credential!,
							token: (e.target as HTMLInputElement).value
						};
						this.setState({ bearerCredential: updatedCredential });
					}}
				/>
			</div>
		);
	}

	private _handleEndpointUrlChange(e: any) {
		this.state.endpoint.isModified = true;
		this.state.endpoint.endpointUrl = (e.target as HTMLInputElement).value;

		this.setState({ ...this.state, hasUnsavedChanges: true });

		this.messaging.postMessage({
			id: 'UpdateSparqlEndpoint',
			endpoint: this.state.endpoint
		});
	}

	private _handleConfigTargetChange = (e: any) => {
		if (this.configTargetSelect) {
			const endpoint = this.state.endpoint;
			endpoint.configTarget = parseInt(this.configTargetSelect.value, 10);

			this.setState({ endpoint, hasUnsavedChanges: true });

			this.messaging.postMessage({
				id: 'UpdateSparqlEndpoint',
				endpoint: this.state.endpoint
			});
		}
	}

	private _handleAuthTabChange = (event: any) => {
		if (this.authTabs) {
			const i = this.authTabs.selectedIndex ?? AuthTabIndex.None;

			console.log('_handleAuthTabChange', i);

			this.setState({ selectedAuthTabIndex: i });
		}
	};

	private _handleSaveEndpoint(e: any) {
		e.preventDefault();

		this.messaging.postMessage({
			id: 'SaveSparqlEndpoint',
			endpoint: this.state.endpoint,
			credential: this._getSelectedCredentialOrNull()
		});

		this.setState({ hasUnsavedChanges: false });
	}

	private _handleTestEndpoint(e: any) {
		e.preventDefault();

		this.setState({ isChecking: true, connectionError: undefined });

		this.messaging.postMessage({
			id: 'TestSparqlEndpoint',
			endpoint: this.state.endpoint,
			credential: this._getSelectedCredentialOrNull()
		});
	}

	private _handleDeleteEndpoint(e: any) {
		e.preventDefault();

		this._executeCommand('mentor.command.removeSparqlEndpoint', this.state.endpoint);
	}

	private _executeCommand(command: string, ...args: any[]) {
		this.messaging.postMessage({ id: 'ExecuteCommand', command, args });
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlEndpointView />);