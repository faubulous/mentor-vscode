import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService, ISettingsService } from '@src/services/interfaces';
import { TreeView } from '@src/views/trees/tree-view';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';
import { DefinitionNodeDecorationProvider } from './definition-node-decoration-provider';

/**
 * Provides a combined explorer for classes, properties and individuals.
 */
export class DefinitionTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.definitionTree";

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get _settings() {
		return container.resolve<ISettingsService>(ServiceToken.SettingsService);
	}

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new DefinitionNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<DefinitionTreeNode>;

	constructor() {
		this.treeView = vscode.window.createTreeView<DefinitionTreeNode>(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this._onDidChangeDocumentContext();

		const disposables: vscode.Disposable[] = [
			this.treeView,
			this._registerDocumentContextHandler(),
			this._registerDecorationProvider(),
			this._registerActiveLanguageHandler(),
			this._registerRefreshCommand()
		];

		const showReferences = this._settings.get('view.showReferences', true);

		vscode.commands.executeCommand("setContext", "view.showReferences", showReferences);
		vscode.commands.executeCommand("setContext", "view.showPropertyTypes", true);
		vscode.commands.executeCommand("setContext", "view.showIndividualTypes", true);

		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(...disposables);
	}

	private _registerDocumentContextHandler(): vscode.Disposable {
		return this._contextService.onDidChangeDocumentContext(() => {
			this._onDidChangeDocumentContext();
		});
	}

	private _registerActiveLanguageHandler(): vscode.Disposable {
		return this._settings.onDidChange("view.activeLanguage", () => {
			this._updateViewTitle();
		});
	}

	private _registerRefreshCommand(): vscode.Disposable {
		return vscode.commands.registerCommand('mentor.command.refreshDefinitionsTree', async () => {
			this._updateView();
			this._updateViewTitle();
			this.treeDataProvider.refresh(this._contextService.activeContext);
		});
	}

	private _registerDecorationProvider(): vscode.Disposable {
		return vscode.window.registerFileDecorationProvider(new DefinitionNodeDecorationProvider());
	}

	private _onDidChangeDocumentContext() {
		this._updateView();
		this._updateViewTitle();
	}

	/**
	 * Shows a message in the tree view if no file is selected.
	 */
	private _updateView() {
		if (!this._contextService.activeContext) {
			this.treeView.message = "No file selected.";
		} else {
			this.treeView.message = undefined;
		}
	}

	/**
	 * Update the title of the tree view to include the active language.
	 */
	private _updateViewTitle() {
		if (this._contextService.activeContext) {
			const title = this.treeView.title?.split(' - ')[0];
			const language = this._contextService.activeContext.activeLanguageTag;

			if (language) {
				this.treeView.title = `${title} - ${language}`;
			} else {
				this.treeView.title = title;
			}
		}
	}
}