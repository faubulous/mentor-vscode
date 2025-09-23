import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { WebviewHost } from '@/webviews/webview-host';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlConnection } from '@/services/sparql-connection';
import { Credential } from '@/services/credential-storage-service';
import stylesheet from './sparql-endpoint-view.css';

interface SparqlEndpointViewState {
	endpoint: SparqlConnection;
	// 0: none, 1: basic, 2: bearer
	selectedAuthTabIndex: number;
	basicCredential: { type: 'basic'; username: string; password: string };
	bearerCredential: { type: 'bearer'; token: string };
	isChecking?: boolean;
	isReachable?: boolean | null;
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
			endpoint: { id: '', endpointUrl: '', scope: 'global' },
			selectedAuthTabIndex: 0,
			basicCredential: { type: 'basic', username: '', password: '' },
			bearerCredential: { type: 'bearer', token: '' },
			isChecking: false,
			isReachable: null
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
				this.setState({
					endpoint: message.endpoint,
					selectedAuthTabIndex: 0,
					basicCredential: { type: 'basic', username: '', password: '' },
					bearerCredential: { type: 'bearer', token: '' },
					isChecking: false,
					isReachable: null
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
					isReachable: message.isReachable
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
				return null; // None
		}
	}

	private _isValid() {
		return this.state?.endpoint.endpointUrl.trim().length > 0;
	}

	private _isReadOnly() {
		return this.state?.endpoint.endpointUrl === 'workspace://';
	}

	render() {
		const endpoint: SparqlConnection = this.state?.endpoint || { id: '', endpointUrl: '', scope: 'global' };
		const isChecking = this.state?.isChecking || false;
		const isReachable = this.state?.isReachable;

		return (
			<div className="sparql-endpoint-view-container">
				<div className="header">
					<h2>SPARQL Endpoint</h2>
					<a href="#"
						onClick={e => this._handleDeleteEndpoint(e)}>
						Delete
					</a>
				</div>
				<form onSubmit={e => this._handleSaveEndpoint(e)}>
					<vscode-label>Endpoint URL</vscode-label>

					<section className="row" style={{ gap: '0.5em' }}>
						<vscode-textfield
							required
							autoFocus
							value={endpoint.endpointUrl}
							placeholder="https://example.org/sparql"
							disabled={this._isReadOnly()}
							onInput={e => this.setState({
								endpoint: {
									...endpoint,
									endpointUrl: (e.target as HTMLInputElement).value
								}
							})}
						/>
						<vscode-button
							type="button"
							disabled={!this._isValid() || this._isReadOnly()}
							onClick={(e) => this._handleTestEndpoint(e)}>
							Test
						</vscode-button>
					</section>

					<section className="status">
						{isChecking && <React.Fragment>
							<vscode-progress-ring></vscode-progress-ring> Checking...
						</React.Fragment>}
						{isReachable === true && <React.Fragment>
							<span className="codicon codicon-pass"></span> Success
						</React.Fragment>}
						{isReachable === false && <React.Fragment>
							<span className="codicon codicon-error"></span> Unreachable
						</React.Fragment>}
					</section>

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
								{this._renderOAuthFields()}
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

	private _renderOAuthFields() {
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

	private _handleAuthTabChange = (event: any) => {
		const i = event.detail?.selectedIndex ?? 0;

		this.setState({ selectedAuthTabIndex: i });
	};

	private _handleSaveEndpoint(e: any) {
		e.preventDefault();

		const credential = this._getSelectedCredentialOrNull();

		this.messaging.postMessage({
			id: 'SaveSparqlEndpoint',
			endpoint: this.state.endpoint,
			credential: credential ?? undefined
		});
	}

	private _handleTestEndpoint(e: any) {
		e.preventDefault();

		this.setState({ isChecking: true, isReachable: null });

		const credential = this._getSelectedCredentialOrNull();

		this.messaging.postMessage({
			id: 'TestSparqlEndpoint',
			endpoint: this.state.endpoint,
			credential: credential
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