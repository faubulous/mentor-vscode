import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { Debouncer } from '@src/utilities/debounce';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { TreeView } from '@src/views/trees/tree-view';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';
import { DefinitionNodeDecorationProvider } from './definition-node-decoration-provider';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

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

	private get _validationService() {
		return container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
	}

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new DefinitionNodeProvider();

	private readonly _decorationProvider: DefinitionNodeDecorationProvider;

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<DefinitionTreeNode>;

	constructor() {
		this._decorationProvider = new DefinitionNodeDecorationProvider(this.treeDataProvider);
		this.treeDataProvider.setIssueColorProvider(this._decorationProvider);

		this.treeView = vscode.window.createTreeView<DefinitionTreeNode>(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		// Defer tree rebuilds while the view is hidden and run them when it is
		// shown again.
		this.treeDataProvider.setViewVisibilityProvider(() => this.treeView.visible);

		this._onDidChangeDocumentContext();

		const disposables: vscode.Disposable[] = [
			this.treeView,
			this._decorationProvider,
			this._registerDocumentContextHandler(),
			this._registerDecorationProvider(),
			this._registerValidationHandler(),
			this._registerActiveLanguageHandler(),
			this._registerPredicateSettingsHandler(),
			this._registerRefreshCommand(),
			this._registerEditorSelectionHandler(),
			this.treeView.onDidChangeVisibility(e => {
				if (e.visible) {
					this.treeDataProvider.flushPendingRefresh();
				}
			})
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

	private _registerPredicateSettingsHandler(): vscode.Disposable {
		// Node labels and tooltips are derived from the mentor.predicates.* settings;
		// re-render the tree as soon as they change so the new predicates apply
		// immediately instead of on the next document switch.
		return vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.predicates.label') || e.affectsConfiguration('mentor.predicates.description')) {
				this.treeDataProvider.refresh(this._contextService.activeContext);
			}
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
		return vscode.window.registerFileDecorationProvider(this._decorationProvider);
	}

	private _registerValidationHandler(): vscode.Disposable {
		// Validations fire per document (and on every edit that drops a stale
		// result); coalesce the full tree rebuilds they trigger.
		const debouncer = new Debouncer(250);

		return this._validationService.onDidValidate(() => {
			debouncer.schedule(() => {
				this.treeDataProvider.refresh(this._contextService.activeContext);
			});
		});
	}

	private _registerEditorSelectionHandler(): vscode.Disposable {
		const debouncer = new Debouncer(300);

		return vscode.window.onDidChangeTextEditorSelection((e) => {
			debouncer.schedule(() => {
				if (this.treeView.visible === false) {
					return;
				}

				const context = this._contextService.contexts[e.textEditor.document.uri.toString()];

				if (!context) {
					return;
				}

				const position = e.selections[0]?.active;

				if (!position) {
					return;
				}

				const iri = this._getShaclFocusNodeForSelection(e.textEditor.document.uri, position)
					?? context.getIriAtPosition(position);

				if (iri) {
					this._revealForUri(iri);
				}
			});
		});
	}

	private _getShaclFocusNodeForSelection(documentUri: vscode.Uri, position: vscode.Position): string | undefined {
		const diagnostics = vscode.languages.getDiagnostics(documentUri);
		const shaclDiagnostic = diagnostics.find((d) => d.source === 'SHACL' && d.range.contains(position));
		const focusNode = (shaclDiagnostic as vscode.Diagnostic & { data?: { focusNode?: string } } | undefined)?.data?.focusNode;

		return typeof focusNode === 'string' && focusNode.length > 0 ? focusNode : undefined;
	}

	private _revealForUri(iri: string): void {
		const node = this.treeDataProvider.getNodeForUri(iri);

		if (node) {
			this.treeView.reveal(node, { select: true, focus: false, expand: true });
		}
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