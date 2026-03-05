import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/service-token';
import { IConfigurationService, IDocumentContextService } from '@src/services/interface';
import { DocumentFactory } from '@src/workspace/document-factory';
import { WorkspaceIndexer } from '@src/workspace/workspace-indexer';
import { DocumentContext } from '@src/workspace/document-context';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { getIriFromToken, getTokenPosition } from '@src/utilities';

/**
 * Provides additional diagnostics for RDF documents that require access 
 * to the mentor in-memory triple store.
 * 
 * This provider supplements the LSP-based diagnostics from the language 
 * servers with diagnostics that require knowledge of the workspace RDF data,
 * such as validating that referenced IRIs exist in the triple store.
 */
export class DocumentLintingProvider implements vscode.Disposable {
	/**
	 * The diagnostic collection for document linting.
	 */
	private readonly _diagnosticCollection: vscode.DiagnosticCollection;

	/**
	 * Disposables for event subscriptions.
	 */
	private readonly _disposables: vscode.Disposable[] = [];

	/**
	 * Cached linting enabled state (kill switch).
	 */
	private _lintingEnabled: boolean = false;

	private get configuration() {
		return container.resolve<IConfigurationService>(ServiceToken.ConfigurationService);
	}

	private get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	private get documentFactory() {
		return container.resolve<DocumentFactory>(ServiceToken.DocumentFactory);
	}

	private get workspaceIndexer() {
		return container.resolve<WorkspaceIndexer>(ServiceToken.WorkspaceIndexer);
	}

	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	constructor() {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-linting');

		this._loadLintingEnabledState();
	}

	/**
	 * Refresh the cached linting enabled state.
	 */
	private _loadLintingEnabledState(): void {
		this._lintingEnabled = !!this.configuration.get<boolean>('linting.enabled', false);
	}

	/**
	 * Register the linting provider and return disposables.
	 */
	register(): vscode.Disposable[] {
		this.workspaceIndexer.waitForIndexed().then(() => {
			// Subscribe to change events
			this._subscribeChangeEvents();

			// Validate all currently open documents and notebooks
			this._validateAllOpenDocuments();
			this._validateAllOpenNotebooks();
		});

		return [this];
	}

	/**
	 * Dispose the provider and clean up resources.
	 */
	dispose(): void {
		this._diagnosticCollection.dispose();

		for (const disposable of this._disposables) {
			disposable.dispose();
		}
	}

	/**
	 * Check if the document is a supported RDF language.
	 */
	private _isSupportedLanguage(languageId: string): boolean {
		return this.documentFactory.supportedLanguages.has(languageId);
	}

	private _subscribeChangeEvents() {
		// Subscribe to text document events
		this._disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => this._onDocumentOpened(doc)));
		this._disposables.push(vscode.workspace.onDidCloseTextDocument((doc) => this._onDocumentClosed(doc)));
		this._disposables.push(vscode.workspace.onDidChangeTextDocument((e) => this._onDocumentChanged(e)));

		// Subscribe to notebook document events
		this._disposables.push(vscode.workspace.onDidOpenNotebookDocument((notebook) => this._onNotebookOpened(notebook)));
		this._disposables.push(vscode.workspace.onDidCloseNotebookDocument((notebook) => this._onNotebookClosed(notebook)));
		this._disposables.push(vscode.workspace.onDidChangeNotebookDocument((e) => this._onNotebookChanged(e)));

		// Subscribe to configuration change events
		this._disposables.push(vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.linting.unresolvedReferenceSeverity')) {
				this._diagnosticCollection.clear();

				this._validateAllOpenDocuments();
			}

			if (e.affectsConfiguration('mentor.linting.enabled')) {
				this._loadLintingEnabledState();

				// Kill switch: if linting is disabled, clear all diagnostics and stop.
				if (!this._lintingEnabled) {
					this._diagnosticCollection.clear();
					return;
				}

				// If it was enabled, validate everything again.
				this._validateAllOpenDocuments();
				this._validateAllOpenNotebooks();
			}
		}));
	}

	/**
	 * Handle document change events.
	 */
	private _onDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		if (!this._lintingEnabled) {
			return;
		}

		if (this._isSupportedLanguage(e.document.languageId)) {
			this._validateDocument(e.document);
		}
	}

	/**
	 * Handle document open events.
	 */
	private _onDocumentOpened(document: vscode.TextDocument): void {
		if (!this._lintingEnabled) {
			return;
		}

		if (this._isSupportedLanguage(document.languageId)) {
			this._validateDocument(document);
		}
	}

	/**
	 * Handle document close events.
	 */
	private _onDocumentClosed(document: vscode.TextDocument): void {
		if (this._isSupportedLanguage(document.languageId)) {
			this._diagnosticCollection.delete(document.uri);
		}
	}

	/**
	 * Handle notebook open events.
	 */
	private _onNotebookOpened(notebook: vscode.NotebookDocument): void {
		if (!this._lintingEnabled) {
			return;
		}

		this._validateNotebook(notebook);
	}

	/**
	 * Handle notebook close events.
	 */
	private _onNotebookClosed(notebook: vscode.NotebookDocument): void {
		// Clear diagnostics for all cells in the notebook
		for (const cell of notebook.getCells()) {
			if (this._isSupportedLanguage(cell.document.languageId)) {
				this._diagnosticCollection.delete(cell.document.uri);
			}
		}
	}

	/**
	 * Handle notebook change events.
	 */
	private _onNotebookChanged(e: vscode.NotebookDocumentChangeEvent): void {
		if (!this._lintingEnabled) {
			return;
		}

		// Validate cells that had content changes
		for (const cellChange of e.cellChanges) {
			if (cellChange.document && this._isSupportedLanguage(cellChange.cell.document.languageId)) {
				this._validateDocument(cellChange.cell.document);
			}
		}

		// Validate newly added cells
		for (const contentChange of e.contentChanges) {
			for (const cell of contentChange.addedCells) {
				if (this._isSupportedLanguage(cell.document.languageId)) {
					this._validateDocument(cell.document);
				}
			}

			// Clear diagnostics for removed cells
			for (const cell of contentChange.removedCells) {
				if (this._isSupportedLanguage(cell.document.languageId)) {
					this._diagnosticCollection.delete(cell.document.uri);
				}
			}
		}
	}

	/**
	 * Validate all currently open RDF documents.
	 */
	private _validateAllOpenDocuments(): void {
		if (!this._lintingEnabled) {
			return;
		}

		for (const document of vscode.workspace.textDocuments) {
			if (this._isSupportedLanguage(document.languageId)) {
				this._validateDocument(document);
			}
		}
	}

	/**
	 * Validate all currently open notebooks.
	 */
	private _validateAllOpenNotebooks(): void {
		if (!this._lintingEnabled) {
			return;
		}

		for (const notebook of vscode.workspace.notebookDocuments) {
			this._validateNotebook(notebook);
		}
	}

	/**
	 * Validate all supported cells in a notebook.
	 */
	private _validateNotebook(notebook: vscode.NotebookDocument): void {
		if (!this._lintingEnabled) {
			return;
		}

		for (const cell of notebook.getCells()) {
			if (this._isSupportedLanguage(cell.document.languageId)) {
				this._validateDocument(cell.document);
			}
		}
	}

	/**
	 * Validate a document and update diagnostics.
	 * @param document The document to validate.
	 */
	private async _validateDocument(document: vscode.TextDocument): Promise<void> {
		if (!this._lintingEnabled) {
			this._diagnosticCollection.delete(document.uri);
			return;
		}

		const context = this.contextService.getDocumentContextFromUri(document.uri.toString());

		if (!context) {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [
			...await this._getUndefinedIriDiagnostics(document, context),
		];

		this._diagnosticCollection.set(document.uri, diagnostics);
	}

	/**
	 * Get diagnostics for undefined IRI references.
	 * Only works for token-based documents (Turtle, TriG, SPARQL).
	 */
	private async _getUndefinedIriDiagnostics(document: vscode.TextDocument, context: DocumentContext): Promise<vscode.Diagnostic[]> {
		// Only token-based documents support IRI validation
		if (!(context instanceof TurtleDocument)) {
			return [];
		}

		const severity = this._getSeverityLevel('linting.unresolvedReferenceSeverity', 'Warning');

		if (severity === null) {
			return [];
		}

		const diagnostics: vscode.Diagnostic[] = [];
		const graphs = this._getGraphsExcept(context.graphs);

		// Cache the resolution status of IRIs for quick lookup of recurring references.
		const cache = new Map<string, boolean>();

		for (let i = 1; i < context.tokens.length; i++) {
			const previousToken = context.tokens[i - 1];

			if (previousToken.tokenType?.name === 'PNAME_NS') {
				// Do not check IRI references for prefix definitions. Wrong prefixes 
				// will be detected by non-resolvable IRIs in the document.
				continue;
			}

			const currentToken = context.tokens[i];

			if (currentToken.tokenType?.name !== 'PNAME_LN' &&
				currentToken.tokenType?.name !== 'IRIREF') {
				continue
			}

			const iri = getIriFromToken(context.namespaces, currentToken);

			if (!iri) {
				continue;
			}

			let resolved = cache.get(iri);

			if (resolved === undefined) {
				resolved = this.vocabulary.hasSubject(graphs, iri) || this.vocabulary.store.hasGraph(iri);

				cache.set(iri, resolved);
			}

			if (resolved === false) {
				const message = `Unresolved IRI reference.`;

				diagnostics.push(this._createDiagnosticForToken(currentToken, message, severity));
			}
		}

		return diagnostics;
	}

	private _getSeverityLevel(setting: string, defaultValue: string): vscode.DiagnosticSeverity | null {
		const value = this.configuration.get(setting, defaultValue);

		switch (value) {
			case 'Error':
				return vscode.DiagnosticSeverity.Error;
			case 'Warning':
				return vscode.DiagnosticSeverity.Warning;
			case 'Information':
				return vscode.DiagnosticSeverity.Information;
			case 'Hint':
				return vscode.DiagnosticSeverity.Hint;
			default:
				return null;
		}
	}

	private _getGraphsExcept(excludedGraphs: string[]): string[] {
		const excluded = new Set<string>(excludedGraphs);;

		return this.vocabulary.store.getGraphs().filter(g => !excluded.has(g));
	}

	private _createDiagnosticForToken(token: IToken, message: string, severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error): vscode.Diagnostic {
		const position = getTokenPosition(token);
		const start = new vscode.Position(position.start.line, position.start.character);
		const end = new vscode.Position(position.end.line, position.end.character);

		return new vscode.Diagnostic(new vscode.Range(start, end), message, severity);
	}
}
