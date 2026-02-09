import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { mentor } from '@src/mentor';
import { SparqlDocument } from '@src/languages/sparql/sparql-document';
import { getIriFromPrefixedName, getTokenPosition } from '@src/utilities';

/**
 * Provides additional diagnostics for SPARQL documents that require access 
 * to the mentor in-memory triple store.
 * 
 * This provider supplements the LSP-based diagnostics from the SPARQL language 
 * server with diagnostics that require knowledge of the workspace RDF data,
 * such as validating that referenced IRIs exist in the triple store.
 */
export class SparqlLintingProvider implements vscode.Disposable {
	/**
	 * The diagnostic collection for SPARQL linting.
	 */
	private readonly _diagnosticCollection: vscode.DiagnosticCollection;

	/**
	 * Disposables for event subscriptions.
	 */
	private readonly _disposables: vscode.Disposable[] = [];

	constructor() {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('sparql-linting');

		this._disposables = [
			// Subscribe to text document events
			vscode.workspace.onDidOpenTextDocument((doc) => this._onDocumentOpened(doc)),
			vscode.workspace.onDidCloseTextDocument((doc) => this._onDocumentClosed(doc)),
			vscode.workspace.onDidChangeTextDocument((e) => this._onDocumentChanged(e)),
			// Subscribe to notebook document events
			vscode.workspace.onDidOpenNotebookDocument((notebook) => this._onNotebookOpened(notebook)),
			vscode.workspace.onDidCloseNotebookDocument((notebook) => this._onNotebookClosed(notebook)),
			vscode.workspace.onDidChangeNotebookDocument((e) => this._onNotebookChanged(e)),
		];

		// Validate all currently open SPARQL documents and notebooks
		mentor.workspaceIndexer.waitForIndexed().then(() => {
			this._validateAllOpenDocuments();
			this._validateAllOpenNotebooks();
		});
	}

	/**
	 * Register the linting provider and return disposables.
	 */
	register(): vscode.Disposable[] {
		return [this, ...this._disposables];
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
	 * Handle document change events.
	 */
	private _onDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		if (e.document.languageId === 'sparql') {
			this._validateDocument(e.document);
		}
	}

	/**
	 * Handle document open events.
	 */
	private _onDocumentOpened(document: vscode.TextDocument): void {
		if (document.languageId === 'sparql') {
			this._validateDocument(document);
		}
	}

	/**
	 * Handle document close events.
	 */
	private _onDocumentClosed(document: vscode.TextDocument): void {
		if (document.languageId === 'sparql') {
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
			if (cell.document.languageId === 'sparql') {
				this._diagnosticCollection.delete(cell.document.uri);
			}
		}
	}

	/**
	 * Handle notebook change events.
	 */
	private _onNotebookChanged(e: vscode.NotebookDocumentChangeEvent): void {
		// Validate cells that had content changes
		for (const cellChange of e.cellChanges) {
			if (cellChange.document && cellChange.cell.document.languageId === 'sparql') {
				this._validateDocument(cellChange.cell.document);
			}
		}

		// Validate newly added cells
		for (const contentChange of e.contentChanges) {
			for (const cell of contentChange.addedCells) {
				if (cell.document.languageId === 'sparql') {
					this._validateDocument(cell.document);
				}
			}

			// Clear diagnostics for removed cells
			for (const cell of contentChange.removedCells) {
				if (cell.document.languageId === 'sparql') {
					this._diagnosticCollection.delete(cell.document.uri);
				}
			}
		}
	}

	/**
	 * Validate all currently open SPARQL documents.
	 */
	private _validateAllOpenDocuments(): void {
		for (const document of vscode.workspace.textDocuments) {
			if (document.languageId === 'sparql') {
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
	 * Validate all SPARQL cells in a notebook.
	 */
	private _validateNotebook(notebook: vscode.NotebookDocument): void {
		for (const cell of notebook.getCells()) {
			if (cell.document.languageId === 'sparql') {
				this._validateDocument(cell.document);
			}
		}
	}

	/**
	 * Validate a SPARQL document and update diagnostics.
	 * @param document The document to validate.
	 */
	private async _validateDocument(document: vscode.TextDocument): Promise<void> {
		const context = mentor.getDocumentContext(document, SparqlDocument);

		if (!context) {
			return;
		}

		// TODO: Implement IRI reference validation against the triple store.
		// This is a placeholder for future implementation.
		// 
		// Example checks that could be implemented:
		// - Validate that referenced classes exist in the store
		// - Validate that referenced properties exist in the store
		// - Validate property domain/range constraints
		// - Validate SHACL shape references
		const diagnostics: vscode.Diagnostic[] = [
			...await this._getUndefinedIriDiagnostics(document, context),
		];

		this._diagnosticCollection.set(document.uri, diagnostics);
	}

	private async _getUndefinedIriDiagnostics(document: vscode.TextDocument, context: SparqlDocument): Promise<vscode.Diagnostic[]> {
		const diagnostics: vscode.Diagnostic[] = [];
		const graphs = this._getGraphsExcept(context.graphs);

		for (const token of context.tokens) {
			let iri;

			switch (token.tokenType?.tokenName) {
				case 'IRIREF': {
					iri = token.image;
					break;
				}
				case 'PNAME_LN': {
					iri = getIriFromPrefixedName(context.namespaces, token.image);
					break;
				}
			}

			if (!iri ||
				mentor.vocabulary.hasSubject(graphs, iri) ||
				mentor.store.hasGraph(iri)) {
				continue;
			}

			const severity = vscode.DiagnosticSeverity.Warning;
			const diagnostic = this._createDiagnosticForToken(token, 'Unresolved IRI reference', severity);

			diagnostics.push(diagnostic);
		}

		return diagnostics;
	}

	private _getGraphsExcept(excludedGraphs: string[]): string[] {
		const excluded = new Set<string>(excludedGraphs);;

		return mentor.store.getGraphs().filter(g => !excluded.has(g));
	}

	private _createDiagnosticForToken(token: IToken, message: string, severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error): vscode.Diagnostic {
		const position = getTokenPosition(token);
		const start = new vscode.Position(position.start.line, position.start.character);
		const end = new vscode.Position(position.end.line, position.end.character);

		return new vscode.Diagnostic(new vscode.Range(start, end), message, severity);
	}
}
