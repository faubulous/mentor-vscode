import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentFactory } from '@src/services/document/document-factory.interface';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { getIriFromToken, getIriFromIriReference, getTokenPosition } from '@src/utilities';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';

/**
 * Provides additional diagnostics for RDF documents that require access
 * to the mentor in-memory triple store.
 *
 * This service supplements the LSP-based diagnostics from the language
 * servers with diagnostics that require knowledge of the workspace RDF data,
 * such as validating that referenced IRIs exist in the triple store.
 */
export class DocumentLintingService implements vscode.Disposable {
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

	private get _vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	private get _documentFactory() {
		return container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);
	}

	private get _workspaceIndexerService() {
		return container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
	}

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	constructor() {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-linting');

		this._loadLintingEnabledState();

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(this);

		// Wait for workspace indexing to complete before starting validation
		this._workspaceIndexerService.waitForIndexed().then(() => {
			// Subscribe to change events
			this._subscribeChangeEvents();

			// Validate all currently open documents and notebooks
			this._validateAllOpenDocuments();
			this._validateAllOpenNotebooks();
		});
	}

	/**
	 * Refresh the cached linting enabled state.
	 */
	private _loadLintingEnabledState(): void {
		this._lintingEnabled = !!getConfig().get<boolean>('linting.enabled', false);
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
		return this._documentFactory.supportedLanguages.has(languageId);
	}

	private _subscribeChangeEvents() {
		// Validate after the context service has fully rebuilt tokens and triples.
		// This fires only for the active document, which is the correct point to
		// read fresh context — text-change events fire before the language server
		// delivers updated tokens, so validating there reads stale data.
		this._disposables.push(this._contextService.onDidChangeDocumentContext((context) => {
			if (!context) {
				return;
			}

			const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === context.uri.toString());

			if (document && this._isSupportedLanguage(document.languageId)) {
				this._validateDocument(document);
			}
		}));

		// Subscribe to text document events
		this._disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => this._onDocumentOpened(doc)));
		this._disposables.push(vscode.workspace.onDidCloseTextDocument((doc) => this._onDocumentClosed(doc)));

		// Subscribe to notebook document events
		this._disposables.push(vscode.workspace.onDidOpenNotebookDocument((notebook) => this._onNotebookOpened(notebook)));
		this._disposables.push(vscode.workspace.onDidCloseNotebookDocument((notebook) => this._onNotebookClosed(notebook)));
		this._disposables.push(vscode.workspace.onDidChangeNotebookDocument((e) => this._onNotebookChanged(e)));

		// Subscribe to configuration change events
		this._disposables.push(vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.linting.unresolvedReferenceSeverity') ||
				e.affectsConfiguration('mentor.linting.unresolvedWorkspaceGraphSeverity')) {
				this._diagnosticCollection.clear();

				this._validateAllOpenDocuments();
				this._validateAllOpenNotebooks();
			}

			if (e.affectsConfiguration('mentor.linting.enabled')) {
				this._loadLintingEnabledState();

				this._diagnosticCollection.clear();

				this._validateAllOpenDocuments();
				this._validateAllOpenNotebooks();
			}
		}));
	}

	/**
	 * Handle document open events.
	 */
	private _onDocumentOpened(document: vscode.TextDocument): void {
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
		// Cell content changes are handled by onDidChangeDocumentContext once the
		// language server delivers fresh tokens. Only handle structural changes here.
		for (const contentChange of e.contentChanges) {
			// Clear diagnostics for removed cells.
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
		for (const notebook of vscode.workspace.notebookDocuments) {
			this._validateNotebook(notebook);
		}
	}

	/**
	 * Validate all supported cells in a notebook.
	 */
	private _validateNotebook(notebook: vscode.NotebookDocument): void {
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
		const context = this._contextService.getDocumentContextFromUri(document.uri.toString());

		if (!context) {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [
			...await this._getInvalidWorkspaceGraphDiagnostics(document, context),
			...(this._lintingEnabled ? await this._getUndefinedIriDiagnostics(document, context) : []),
		];

		this._diagnosticCollection.set(document.uri, diagnostics);
	}

	/**
	 * Get diagnostics for workspace: URI references that do not resolve to a known graph in the store.
	 * Only works for token-based documents (Turtle, TriG, SPARQL).
	 */
	private async _getInvalidWorkspaceGraphDiagnostics(document: vscode.TextDocument, context: IDocumentContext): Promise<vscode.Diagnostic[]> {
		if (!(context instanceof TurtleDocument)) {
			return [];
		}

		const severity = this._getSeverityLevel('linting.unresolvedWorkspaceGraphSeverity', 'Warning');

		if (severity === null) {
			return [];
		}

		const diagnostics: vscode.Diagnostic[] = [];
		const cache = new Map<string, boolean>();

		for (const token of context.tokens) {
			if (token.tokenType?.name !== 'IRIREF') {
				continue;
			}

			const iri = getIriFromIriReference(token.image);

			if (!iri.startsWith('workspace:')) {
				continue;
			}

			// Skip deprecated workspace:/path URIs — already reported by DeprecatedWorkspaceUriLinter.
			if (/^workspace:\/(?!\/)/.test(iri)) {
				continue;
			}

			const canonicalUri = WorkspaceUri.toCanonicalString(iri);

			let exists = cache.get(canonicalUri);

			if (exists === undefined) {
				exists = this._vocabulary.store.hasGraph(canonicalUri);
				cache.set(canonicalUri, exists);
			}

			if (!exists) {
				const diagnostic = this._createDiagnosticForToken(
					token,
					`Workspace graph not found: '${canonicalUri}'.`,
					severity,
					'UnresolvedWorkspaceGraph'
				);

				diagnostics.push(diagnostic);
			}
		}

		return diagnostics;
	}

	/**
	 * Get diagnostics for undefined IRI references.
	 * Only works for token-based documents (Turtle, TriG, SPARQL).
	 */
	private async _getUndefinedIriDiagnostics(document: vscode.TextDocument, context: IDocumentContext): Promise<vscode.Diagnostic[]> {
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
				resolved = this._vocabulary.hasSubject(graphs, iri) || this._vocabulary.store.hasGraph(iri);

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
		const value = getConfig().get(setting, defaultValue);

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

		return this._vocabulary.store.getGraphs().filter(g => !excluded.has(g));
	}

	private _createDiagnosticForToken(token: IToken, message: string, severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error, code?: string): vscode.Diagnostic {
		const position = getTokenPosition(token);
		const start = new vscode.Position(position.start.line, position.start.character);
		const end = new vscode.Position(position.end.line, position.end.character);

		const diagnostic = new vscode.Diagnostic(new vscode.Range(start, end), message, severity);

		if (code !== undefined) {
			diagnostic.code = code;
		}

		return diagnostic;
	}
}
