import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { compile, isTemplate } from 'triplate';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/languages/sparql/services';
import { QuadsResult } from '@src/languages/sparql/services/sparql-query-state';
import { IDocumentContextService } from '@src/services/document';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { renderTemplateInteractively } from '@src/languages/triplate/triplate-prompt';
import { ExecuteCommandMessage } from '@src/views/webviews/webview-messaging';

export const NOTEBOOK_TYPE = 'mentor-notebook';

export class NotebookController implements vscode.Disposable {
	private readonly _id = 'mentor-notebook-controller';

	private readonly _label = 'Mentor Notebook';

	private readonly _supportedLanguages = ['sparql', 'turtle', 'trig', 'ntriples', 'nquads', 'xml'];

	private readonly _controller: vscode.NotebookController;

	private readonly _messaging: vscode.NotebookRendererMessaging;

	private readonly _subscriptions: vscode.Disposable[] = [];

	private _executionOrder = 0;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(this._id, NOTEBOOK_TYPE, this._label);
		this._controller.executeHandler = this._executeAll.bind(this);
		this._controller.supportedLanguages = this._supportedLanguages;
		this._controller.supportsExecutionOrder = true;

		this._subscriptions.push(this._controller);

		this._messaging = vscode.notebooks.createRendererMessaging('mentor.notebook.sparqlResultsRenderer');
		this._messaging.onDidReceiveMessage(this._onDidReceiveMessage, this, this._subscriptions);

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(this);
	}

	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}
	}

	private _onDidReceiveMessage(e: { message: ExecuteCommandMessage | { id: string } }) {
		const message = e.message;

		if (message.id === 'ExecuteCommand') {
			const { command, args } = message as ExecuteCommandMessage;

			vscode.commands.executeCommand(command, ...(args ?? []));
		}
	}

	private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
		for (const cell of cells) {
			this._doExecution(cell);
		}
	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
		const text = cell.document.getText();

		// Triplate template cells are rendered first, then executed (SPARQL) or validated
		// (RDF) so their output lands in the cell like an ordinary query/validation cell.
		if (isTemplate(text)) {
			await this._executeTemplate(cell, text);
			return;
		}

		// SPARQL cells run their query; all other RDF-data cells (turtle, trig,
		// ntriples, nquads, xml) validate against their configured SHACL shapes.
		if (cell.document.languageId === 'sparql') {
			await this.executeQueryInCell(cell);
		} else {
			await this._validateCell(cell);
		}
	}

	/**
	 * Compiles and renders a triplate template cell, prompting for parameter values,
	 * then runs the cell's primary action on the rendered output: SPARQL templates are
	 * executed and RDF templates are SHACL-validated, matching the native play button's
	 * behaviour for non-template cells. (Code-lens Run/Run-example render a Turtle preview
	 * instead — see routeRenderedTriplate.)
	 */
	private async _executeTemplate(cell: vscode.NotebookCell, text: string): Promise<void> {
		let compiled: ReturnType<typeof compile>;

		try {
			compiled = compile(text);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to compile template: ${(error as Error).message}`);
			return;
		}

		const rendered = await renderTemplateInteractively(compiled);

		if (rendered === undefined) {
			// The user cancelled, or rendering failed (already reported).
			return;
		}

		if (cell.document.languageId === 'sparql') {
			await this.executeQueryInCell(cell, rendered);
		} else {
			await this.validateContentInCell(cell, rendered);
		}
	}

	private async _validateCell(cell: vscode.NotebookCell) {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		try {
			const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
			const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

			// The validation service operates on the document context by URI, so make
			// sure the cell has been loaded before validating.
			if (!contextService.contexts[cell.document.uri.toString()]) {
				await contextService.loadDocument(cell.document);
			}

			// Mirror the validateDocument command: when no shapes are configured, open
			// the shape-configuration flow instead of validating.
			const shapeGraphs = validationService.getEffectiveShapeGraphs(cell.document.uri);

			if (shapeGraphs.length === 0) {
				await vscode.commands.executeCommand('mentor.command.manageShaclShapes');
				await execution.clearOutput();
				execution.end(undefined, Date.now());
				return;
			}

			const result = await validationService.validateDocument(cell.document.uri);

			if (!result) {
				await execution.clearOutput();
				execution.end(undefined, Date.now());
				return;
			}

			const summary = this._getValidationSummary(validationService, cell.document.uri, result);

			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(summary, 'text/plain')
			])]);

			execution.end(result.conforms, Date.now());
		} catch (error: any) {
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);

			execution.end(false, Date.now());
		}
	}

	/**
	 * Writes a rendered RDF template result to the cell output as `text/turtle`, the same
	 * way CONSTRUCT/DESCRIBE query results are shown. No SHACL validation is performed.
	 * @param cell The notebook cell whose output is replaced.
	 * @param content The rendered RDF content to display.
	 */
	async renderContentInCell(cell: vscode.NotebookCell, content: string): Promise<void> {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		try {
			// Mirror how CONSTRUCT/DESCRIBE query results are surfaced: the rendered RDF is
			// the end result and is shown as the cell output.
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(content, 'text/turtle')
			])]);

			execution.end(true, Date.now());
		} catch (error: any) {
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);

			execution.end(false, Date.now());
		}
	}

	/**
	 * Shows a rendered RDF template result as the cell output and SHACL-validates it against the
	 * cell's configured shapes. The rendered Turtle is the cell output; conformance is surfaced via
	 * snackbars (mirroring the Validate Document command) and the cell's pass/fail run status rather
	 * than as redundant in-cell text. Validation runs against a hidden temporary document (never
	 * shown) so the template cell's own text is left untouched.
	 * Used by the native play button for RDF template cells; the code-lens path uses
	 * {@link renderContentInCell} instead.
	 * @param cell The notebook cell whose shape configuration and output are used.
	 * @param content The rendered RDF content to show and validate.
	 */
	async validateContentInCell(cell: vscode.NotebookCell, content: string): Promise<void> {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		// The rendered RDF is the cell output; SHACL conformance is reported via snackbars below.
		await execution.replaceOutput([new vscode.NotebookCellOutput([
			vscode.NotebookCellOutputItem.text(content, 'text/turtle')
		])]);

		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		// Shape configuration lives on the cell, not on the temporary rendered document.
		const shapeGraphs = validationService.getEffectiveShapeGraphs(cell.document.uri);

		if (shapeGraphs.length === 0) {
			// No shapes configured — the rendered output is the result; nothing to validate.
			execution.end(true, Date.now());
			return;
		}

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const document = await vscode.workspace.openTextDocument({ content, language: cell.document.languageId });

		try {
			await contextService.loadDocument(document, true);

			const result = await validationService.validateDocument(document.uri, shapeGraphs);

			if (result && !result.conforms) {
				vscode.window.showWarningMessage(`SHACL validation: ${result.results.length} issue(s) found.`);
			} else if (result) {
				vscode.window.showInformationMessage('SHACL validation: No issues found.');
			}

			execution.end(result?.conforms ?? true, Date.now());
		} catch (error: any) {
			vscode.window.showErrorMessage(`SHACL validation failed: ${(error as Error).message}`);
			execution.end(false, Date.now());
		} finally {
			// Validation ran against a hidden temporary document — clear its diagnostics so they
			// don't linger in the Problems panel as a phantom untitled file, then drop its
			// context and store graphs.
			validationService.clearDiagnostics(document.uri);
			contextService.handleDocumentClosed(document);
		}
	}

	private _getValidationSummary(validationService: ShaclValidationService, documentUri: vscode.Uri, result: { conforms: boolean; results: unknown[] }): string {
		return result.conforms
			? 'SHACL validation: Conforms — no issues found.'
			: validationService.getReportAsText(documentUri)
				?? `SHACL validation: ${result.results.length} issue(s) found.`;
	}

	/**
	 * Executes a SPARQL query in a notebook cell and renders the result in the cell output.
	 * @param cell The notebook cell whose connection and output are used.
	 * @param query The SPARQL query string. Defaults to the cell's own text.
	 */
	async executeQueryInCell(cell: vscode.NotebookCell, query: string = cell.document.getText()): Promise<void> {
		const execution = this._controller.createNotebookCellExecution(cell);

		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());

		// We need a cancellation token source so we can request cancellation
		// from anywhere in Mentor. The execution.token is only cancelled when
		// the user explicitly cancels the cell execution in the notebook.
		const tokenSource = new vscode.CancellationTokenSource();

		execution.token.onCancellationRequested(() => {
			tokenSource.cancel();
		});

		try {
			const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
			let queryState = queryService.createQuery(cell, query);

			queryState = await queryService.executeQuery(queryState, tokenSource);

			if (queryState.queryType === 'bindings' || queryState.queryType === 'boolean') {
				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.json(queryState, 'application/sparql-results+json')
				])]);
			} else if (queryState.queryType === 'quads') {
				const result = queryState.result as QuadsResult;

				await execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(result?.document, 'text/turtle')
				])]);
			}

			execution.end(true, Date.now());
		} catch (error: any) {
			await execution.replaceOutput([new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.error(error as Error)
			])]);

			execution.end(false, Date.now());
		}
	}
}
