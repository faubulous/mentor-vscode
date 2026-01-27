import * as vscode from 'vscode';
import { WebviewComponentFactory } from './webview-component-factory';
import { ExecuteCommandMessage } from './webview-messaging';

/**
 * Base controller for webviews providing unified lifecycle for both Views (WebviewView)
 * and Panels (WebviewPanel), plus typed message handling.
 */
export abstract class WebviewController<M = any> implements vscode.WebviewViewProvider {
	/**
	 * Optional contributed view id for components that are shown in the sidebar or the panel area.
	 * @remarks If set, the controller supports opening a panel via the `show` method.
	 */
	readonly viewType?: string;

	/**
	 * Optional panel identifier for components that are shown in the editor area.
	 * @remarks If set, the controller supports opening a panel via the `show` method.
	 */
	readonly panelId?: string;

	/**
	 * Optional panel title (for editor/terminal panels).
	 */
	readonly panelTitle?: string;

	/**
	 * Relative JS bundle path inside out/ used by this controller (e.g. "sparql-endpoint-view.js").
	 */
	protected readonly componentPath: string;

	protected context?: vscode.ExtensionContext;

	protected view?: vscode.WebviewView;

	protected panel?: vscode.WebviewPanel;

	private _subscriptions: vscode.Disposable[] = [];

	constructor(init: {
		componentPath: string;
		viewType?: string;
		panelId?: string;
		panelTitle?: string;
	}) {
		this.componentPath = init.componentPath;
		this.viewType = init.viewType;
		this.panelId = init.panelId;
		this.panelTitle = init.panelTitle;
	}

	/**
	 * Register this controller with VS Code. Will register the WebviewView provider if viewType is present.
	 * @param context The extension context to register with.
	 * @return An array of disposables to be disposed on extension deactivation.
	 */
	register(context: vscode.ExtensionContext): vscode.Disposable[] {
		this.context = context;

		if (this.viewType) {
			this._subscriptions.push(vscode.window.registerWebviewViewProvider(this.viewType, this));
		}

		return this._subscriptions;
	}

	/**
	 * Unified show for panel controllers. Creates or reveals the editor panel.
	 * @param viewColumn The view column to show the panel in.
	 * @throws If the controller is not registered or does not support panels.
	 */
	async show(viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active) {
		if (!this.context) {
			throw new Error('Extension context is not initialized. Please register the controller first.');
		}

		if (!this.panelId || !this.panelTitle) {
			throw new Error('This controller does not support panels (panelId or panelTitle are not set).');
		}

		if (!this.panel) {
			this.panel = new WebviewComponentFactory(this.context, this.componentPath).createPanel(
				this.panelId,
				this.panelTitle,
				viewColumn
			);

			this.panel.webview.onDidReceiveMessage((message: M) => this.onDidReceiveMessage(message));
			this.panel.onDidDispose(() => (this.panel = undefined));
		} else {
			this.panel.reveal(viewColumn);
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		if (!this.context) {
			throw new Error('Extension context is not initialized. Please register the controller first.');
		}

		this.view = new WebviewComponentFactory(this.context, this.componentPath).createView(webviewView);
		this.view.webview.onDidReceiveMessage((message: M) => this.onDidReceiveMessage(message), this, this._subscriptions);
	}

	/**
	 * Post a message to the active webview (view preferred, else panel).
	 * @param message The message to post.
	 */
	protected postMessage(message: M) {
		if (this.view) {
			this.view.webview.postMessage(message);
		} else if (this.panel) {
			this.panel.webview.postMessage(message);
		}
	}

	/**
	 * Handle messages received from the webview. Override this in subclasses to handle
	 * custom messages. Call `super.onDidReceiveMessage(message)` for unhandled messages
	 * to enable default handling of common message types like `ExecuteCommand`.
	 * @param message The message received from the webview.
	 * @returns `true` if the message was handled, `false` otherwise.
	 */
	protected async onDidReceiveMessage(message: M): Promise<boolean> {
		const msg = message as unknown as ExecuteCommandMessage;

		if (msg.id === 'ExecuteCommand') {
			await vscode.commands.executeCommand(msg.command, ...(msg.args || []));
			return true;
		}

		return false;
	}
}
