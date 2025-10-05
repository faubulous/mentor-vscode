import * as React from 'react';
import { createRoot } from 'react-dom/client';
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
		const tabsElement = document.querySelector('vscode-tabs');

		if (tabsElement) {
			tabsElement.addEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}
	}

	componentWillUnmount(): void {
		const tabsElement = document.querySelector('vscode-tabs');

		if (tabsElement) {
			tabsElement.removeEventListener('vsc-tabs-select', this._handleAuthTabChange);
		}
	}

	override componentDidReceiveMessage(message: SparqlEndpointMessages) {
		switch (message.id) {
			case 'EditSparqlEndpoint': {
				console.log('EditSparqlEndpoint', message.endpoint);

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

	private _isValid() {
		return this.state?.endpoint.endpointUrl.trim().length > 0;
	}

	private _isReadOnly() {
		return this.state?.endpoint.endpointUrl === 'workspace://';
	}

	render() {
		const endpoint: SparqlEndpoint = this.state?.endpoint;

		if (!endpoint) {
			return <div>Loading...</div>;
		}

		const isChecking = this.state?.isChecking || false;
		const connectionError = this.state?.connectionError;

		return (
			<div className="sparql-endpoint-view-container">
				<div className="header">
					<h2>SPARQL Endpoint</h2>
					<a href="#"
						onClick={e => this._handleDeleteEndpoint(e)}>
						Delete
					</a>
				</div>
				<form onSubmit={e => this._handleSaveEndpoint(e)} onChange={e => this._handleFormChange(e)}>
					<vscode-label>Endpoint URL</vscode-label>

					<section className="row" style={{ gap: '0.5em', minHeight: '40px', marginBottom: 0 }}>
						<vscode-textfield
							required
							value={endpoint.endpointUrl}
							placeholder="https://example.org/sparql"
							disabled={this._isReadOnly()}
							onInput={e => {
								endpoint.endpointUrl = (e.target as HTMLInputElement).value;

								this._handleFormChange(e)
							}}
						/>
						<vscode-button
							type="button"
							disabled={!this._isValid() || this._isReadOnly() || isChecking}
							onClick={(e) => this._handleTestEndpoint(e)}>
							{isChecking ? <vscode-progress-ring></vscode-progress-ring> : 'Test'}
						</vscode-button>
					</section>

					<div className="status">
						{connectionError === null && <React.Fragment>
							<span className="codicon codicon-pass"></span> Success
						</React.Fragment>}
						{connectionError && <React.Fragment>
							<span className="codicon codicon-error"></span> {connectionError ? `Error ${connectionError.code}: ${connectionError.message}` : 'Unreachable'}
						</React.Fragment>}
					</div>

					<section>
						<vscode-label style={{ marginTop: '1em' }}>Authentication</vscode-label>
						<vscode-tabs selectedIndex={this.state?.selectedAuthTabIndex ?? 0}>
							<vscode-tab-header id="none" slot="header">
								None
							</vscode-tab-header>
							<vscode-tab-panel>
								No authentication
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
					</section>

					<vscode-button type="submit" disabled={!this._isValid() || this._isReadOnly()}>
						Save
					</vscode-button>
				</form>
			</div>
		);
	}

	private _renderBasicAuthFields() {
		const credential = this.state?.basicCredential;

		return (
			<div className="column">
				<vscode-textfield
					value={credential?.username ?? ''}
					placeholder="Username"
					label="Username"
					disabled={this._isReadOnly()}
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
					disabled={this._isReadOnly()}
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
					disabled={this._isReadOnly()}
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