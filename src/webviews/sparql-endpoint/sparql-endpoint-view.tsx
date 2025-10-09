import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { VscodeContextMenu, VscodeIcon, VscodeTabs } from '@vscode-elements/elements';
import { WebviewHost } from '@/webviews/webview-host';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlEndpoint } from '@/services/sparql-endpoint';
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

	tabsRef = React.createRef<VscodeTabs>();

	contextMenu: VscodeContextMenu | null = null;

	contextMenuToggle: VscodeIcon | null = null;

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

		// Listen for tab selection changes on the auth tabs
		const tabsElement = this.tabsRef.current;

		if (tabsElement) {
			tabsElement.addEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}
	}

	componentWillUnmount(): void {
		const tabsElement = this.tabsRef.current;

		if (tabsElement) {
			tabsElement.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
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
				<form onSubmit={(e) => this._handleSaveEndpoint(e)} onChange={(e) => this._handleFormChange(e)}>
					<div className="form-header">
						<div className="form-title">
							<h2>SPARQL Endpoint</h2>
						</div>
						<div className="form-buttons">
							<div className="menu-wrapper">
								<vscode-icon
									action-icon
									name="kebab-vertical"
									title="More Actions"
									ref={this._setContextMenuToggleRef.bind(this)}
								></vscode-icon>
								<vscode-context-menu ref={this._setContextMenuRef.bind(this)}>
								</vscode-context-menu>
							</div>
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
								onInput={e => {
									endpoint.endpointUrl = (e.target as HTMLInputElement).value;

									this._handleFormChange(e)
								}}
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
							{connectionError.code === 0 && <p>Host unreachable. This might indicate a failing CORS preflight request or a network connection problem.</p>}
							{connectionError.code !== 0 && <h4>Error {connectionError.code}</h4>}
							{connectionError.code !== 0 && <p>connectionError.message</p>}
						</div>}
					</vscode-form-group>

					<vscode-form-group variant="vertical">
						<vscode-label>Configuration Scope</vscode-label>
						<vscode-single-select
							value={String(endpoint.configTarget)}
							disabled={this._isFormReadOnly()}
							onChange={(e) => this._handleFormChange(e)}>
							<vscode-option value="1">User</vscode-option>
							<vscode-option value="2">Workspace</vscode-option>
							<vscode-option value="3">Workspace Folder</vscode-option>
						</vscode-single-select>
					</vscode-form-group>

					<vscode-form-group variant="vertical">
						<vscode-label>Authentication</vscode-label>
						<vscode-tabs selectedIndex={this.state?.selectedAuthTabIndex ?? 0}>
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

	private _setContextMenuRef(contextMenu: VscodeContextMenu | null) {
		if (this.contextMenu) {
			this.contextMenu.removeEventListener('vsc-context-menu-select', this._onDidContextMenuSelectItem);
		}

		this.contextMenu = contextMenu;

		if (contextMenu) {
			contextMenu.data = [
				{ label: 'Delete', value: 'delete' }
			];

			contextMenu.addEventListener('vsc-context-menu-select', this._onDidContextMenuSelectItem);
		}
	}

	private _onDidContextMenuSelectItem = (event: any) => {
		if (event.detail?.value === 'delete') {
			this._handleDeleteEndpoint(event);
		}
	}

	private _setContextMenuToggleRef(contextMenuToggle: VscodeIcon | null) {
		this.contextMenuToggle = contextMenuToggle;

		if (contextMenuToggle) {
			contextMenuToggle.addEventListener('click', () => {
				if (this.contextMenu) {
					this.contextMenu!.show = !this.contextMenu!.show;
				}
			});
		}
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

	private _handleFormChange(e: any) {
		this.state.endpoint.isModified = true;

		this.setState({ ...this.state, hasUnsavedChanges: true });

		this.messaging.postMessage({
			id: 'UpdateSparqlEndpoint',
			endpoint: this.state.endpoint
		});
	}

	private _handleAuthTabChange = (event: any) => {
		const i = event.detail?.selectedIndex ?? AuthTabIndex.None;

		this.setState({ selectedAuthTabIndex: i });
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