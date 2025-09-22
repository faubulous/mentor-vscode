import * as vscode from 'vscode';
import { WebviewComponentFactory } from './webview-component-factory';

/**
 * Base controller for webviews providing unified lifecycle for both Views (WebviewView)
 * and Panels (WebviewPanel), plus typed message handling.
 */
export abstract class WebviewController<M = any> implements vscode.WebviewViewProvider {
	/**
	 * Optional contributed view id for sidebar / panel views.
	 */
	public readonly viewType?: string;

	/**
	 * Optional panel identifier for editor / terminal panels.
	 * @remarks If set, the controller supports opening a panel via the `show` method.
	 */
	public readonly panelId?: string;

	/**
	 * Optional panel title (for editor/terminal panels).
	 */
	public readonly panelTitle?: string;

	/**
	 * Relative JS bundle path inside out/ used by this controller (e.g. "sparql-endpoint-view.js").
	 */
	protected readonly componentPath: string;

	protected _context?: vscode.ExtensionContext;

	protected _view?: vscode.WebviewView;

	protected _panel?: vscode.WebviewPanel;

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
		this._context = context;

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
	show(viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active) {
		if (!this._context) {
			throw new Error('Extension context is not initialized. Please register the controller first.');
		}

		if (!this.panelId || !this.panelTitle) {
			throw new Error('This controller does not support panels (panelId/panelTitle not set).');
		}

		if (!this._panel) {
			this._panel = new WebviewComponentFactory(this._context, this.componentPath).createPanel(
				this.panelId,
				this.panelTitle,
				viewColumn
			);

			this._panel.webview.onDidReceiveMessage((message: M) => this.onDidReceiveMessage(message));
			this._panel.onDidDispose(() => (this._panel = undefined));
		} else {
			this._panel.reveal(viewColumn);
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		if (!this._context) {
			throw new Error('Extension context is not initialized. Please register the controller first.');
		}

		this._view = new WebviewComponentFactory(this._context, this.componentPath).createView(webviewView);
		this._view.webview.onDidReceiveMessage((message: M) => this.onDidReceiveMessage(message), this, this._subscriptions);
	}

	/**
	 * Post a message to the active webview (view preferred, else panel).
	 * @param message The message to post.
	 */
	protected postMessage(message: M) {
		if (this._view) {
			this._view.webview.postMessage(message);
		} else if (this._panel) {
			this._panel.webview.postMessage(message);
		}
	}

	/**
	 * Handle messages received from the webview
	 * @param message The message received from the webview.
	 * @note Implement this in subclasses to handle messages from the webview.
	 */
	protected abstract onDidReceiveMessage(message: M): void | Promise<void>;
}
