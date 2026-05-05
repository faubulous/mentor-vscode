import * as vscode from 'vscode';
import { DataFactory as N3DataFactory } from 'n3';
import { DatasetCore, Quad, Term } from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { Validator } from 'shacl-engine';
import { container } from 'tsyringe';
import { _RDF, _SH, _XSD, Store } from '@faubulous/mentor-rdf';
import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getConfig } from '@src/utilities/vscode/config';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { ShaclDiagnosticsMapper } from './shacl-diagnostics-mapper';
import { migrateShaclValidationConfig, resolveEffectiveShapeGraphs, ShaclValidationConfiguration } from './shacl-validation-configuration';

/**
 * A read-only DatasetCore view over a subset of graphs in the internal Store.
 * Avoids copying triples by delegating match() and iteration directly to the store.
 */
// TODO: Move this into mentor-rdf
class StoreDatasetView implements DatasetCore {
	private readonly _graphUris: readonly string[];
	private readonly _s: Term | null;
	private readonly _p: Term | null;
	private readonly _o: Term | null;

	constructor(
		private readonly _store: Store,
		graphUris: readonly string[],
		s: Term | null = null,
		p: Term | null = null,
		o: Term | null = null
	) {
		this._graphUris = graphUris;
		this._s = s;
		this._p = p;
		this._o = o;
	}

	get size(): number {
		let n = 0;

		for (const _ of this) {
			n++;
		}

		return n;
	}

	add(_quad: Quad): this {
		return this;
	}

	delete(_quad: Quad): this {
		return this;
	}

	has(quad: Quad): boolean {
		for (const q of this) {
			if (q.equals(quad)) {
				return true;
			}
		}

		return false;
	}

	match(s?: Term | null, p?: Term | null, o?: Term | null, g?: Term | null): DatasetCore {
		const graphUris = g != null
			? (this._graphUris.includes(g.value) ? [g.value] : [])
			: this._graphUris as string[];
			
		return new StoreDatasetView(this._store, graphUris, s ?? null, p ?? null, o ?? null);
	}

	[Symbol.iterator](): Iterator<Quad> {
		return this._store.matchAll(
			this._graphUris as string[],
			this._s as any,
			this._p as any,
			this._o as any,
			false
		);
	}
}

/**
 * A combined RDF/JS factory that provides DataFactory methods plus a dataset() method,
 * which is required by shacl-engine's Validator.
 */
const rdfFactory = {
	...N3DataFactory,
	// N3's literal() throws when passed null (vs. undefined) as the language/datatype argument.
	// shacl-engine calls factory.literal(text, message.language || null) when there is no
	// language tag, so we normalize null to undefined here.
	literal(value: string, languageOrDataType?: any) {
		return N3DataFactory.literal(value, languageOrDataType ?? undefined);
	},
	dataset(): DatasetCore {
		return RdfStore.createDefault().asDataset();
	}
};

/**
 * Result of a SHACL validation operation.
 */
export interface ShaclValidationResult {
	/**
	 * Whether the data conforms to all shapes.
	 */
	conforms: boolean;

	/**
	 * The validation report as an RDF dataset.
	 */
	reportDataset: DatasetCore;

	/**
	 * Individual validation results.
	 */
	results: ShaclValidationResultEntry[];
}

/**
 * An individual SHACL validation result entry.
 */
export interface ShaclValidationResultEntry {
	/** 
	 * The focus node that was validated.
	 */
	focusNode: string;

	/**
	 * The severity of the violation (sh:Violation, sh:Warning, sh:Info).
	 */
	severity: string;

	/**
	 * The constraint component that triggered the result.
	 */
	constraintComponent: string;

	/**
	 * The result message(s).
	 */
	messages: string[];

	/**
	 * The result path (property), if applicable.
	 */
	path?: string;

	/**
	 * The value that caused the violation, if applicable.
	 */
	value?: string;

	/**
	 * The source shape URI.
	 */
	sourceShape: string;
}

/**
 * Service for validating RDF documents against SHACL shapes.
 */
export class ShaclValidationService implements vscode.Disposable {
	private readonly _diagnosticCollection: vscode.DiagnosticCollection;
	private readonly _diagnosticsMapper: ShaclDiagnosticsMapper;
	private readonly _disposables: vscode.Disposable[] = [];

	/**
	 * Stores the last validation result per document URI for report export.
	 */
	private readonly _lastResults = new Map<string, ShaclValidationResult>();

	private readonly _onDidValidate = new vscode.EventEmitter<vscode.Uri>();

	/**
	 * Fired when a validation completes (or results are cleared) for a document.
	 */
	readonly onDidValidate: vscode.Event<vscode.Uri> = this._onDidValidate.event;

	private get _store() {
		return container.resolve<Store>(ServiceToken.Store);
	}

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	constructor() {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-shacl');
		this._diagnosticsMapper = new ShaclDiagnosticsMapper();

		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(this);

		// Clear diagnostics when a document is closed.
		this._disposables.push(
			vscode.workspace.onDidCloseTextDocument(doc => {
				this._diagnosticCollection.delete(doc.uri);
				this._lastResults.delete(doc.uri.toString());
				this._onDidValidate.fire(doc.uri);
			})
		);
	}

	/**
	 * Get the effective shape graph URIs for a given document.
	 */
	getEffectiveShapeGraphs(documentUri: vscode.Uri): string[] {
		const shaclConfig = getConfig('shacl');
		const validationConfig = shaclConfig.get<ShaclValidationConfiguration>('validation', {});
		const wsUri = WorkspaceUri.toWorkspaceUri(documentUri);
		const key = wsUri ? WorkspaceUri.toCanonicalString(wsUri) : documentUri.toString();

		return resolveEffectiveShapeGraphs(validationConfig, key);
	}

	/**
	 * Validate a document against the specified shape files.
	 * @param documentUri The URI of the document to validate.
	 * @param shapeFileUris Workspace-relative paths to SHACL shape files. If empty, effective shapes are used.
	 * @returns The validation result or undefined if no shapes are available.
	 */
	async validateDocument(documentUri: vscode.Uri, shapeFileUris?: string[]): Promise<ShaclValidationResult | undefined> {
		const context = this._contextService.contexts[documentUri.toString()];

		if (!context) {
			vscode.window.showInformationMessage('No document context available. Please open the document first.');

			return undefined;
		}

		const shapeGraphUris = shapeFileUris?.length ? shapeFileUris : this.getEffectiveShapeGraphs(documentUri);

		if (shapeGraphUris.length === 0) {
			vscode.window.showInformationMessage('No SHACL shape files configured for this document.');

			return undefined;
		}

		for (const graphUri of shapeGraphUris) {
			if (!this._store.hasGraph(graphUri)) {
				vscode.window.showWarningMessage(`Shape graph does not exist: ${graphUri}`);
			}
		}

		const fileName = documentUri.path.split('/').pop() ?? documentUri.toString();
		const statusBarMessage = vscode.window.setStatusBarMessage(`$(loading~spin) Running SHACL validation for: ${fileName}`);
		const statusBarMessageStartTime = Date.now();
		const minStatusBarMessageDurationMs = 300;

		// Create read-only views over the store — no triple copying needed.
		const shapesDataset = new StoreDatasetView(this._store, shapeGraphUris);
		const dataDataset = new StoreDatasetView(this._store, context.graphs);

		// Run SHACL validation
		const validator = new Validator(shapesDataset, { factory: rdfFactory });

		// Yield once so VS Code can paint the status bar spinner before validation starts.
		await new Promise(resolve => setTimeout(resolve, 0));

		try {
			const report = await validator.validate({ dataset: dataDataset });

			// Map results
			const result: ShaclValidationResult = {
				conforms: report.conforms,
				reportDataset: report.dataset,
				results: this._mapResults(report.results)
			};

			// Cache and publish diagnostics
			this._lastResults.set(documentUri.toString(), result);
			const quadContexts = context instanceof TurtleDocument ? context.getQuadContexts() : undefined;

			this._publishDiagnostics(documentUri, context, result, quadContexts);

			this._onDidValidate.fire(documentUri);

			return result;
		} catch (error) {
			vscode.window.showErrorMessage(`SHACL validation failed: ${error}`);

			return undefined;
		} finally {
			const elapsedMs = Date.now() - statusBarMessageStartTime;

			if (elapsedMs < minStatusBarMessageDurationMs) {
				await new Promise(resolve => setTimeout(resolve, minStatusBarMessageDurationMs - elapsedMs));
			}

			statusBarMessage.dispose();
		}
	}

	/**
	 * Get the last validation result for a document.
	 */
	getLastResult(documentUri: vscode.Uri): ShaclValidationResult | undefined {
		return this._lastResults.get(documentUri.toString());
	}

	/**
	 * Clear validation diagnostics for a document.
	 */
	clearDiagnostics(documentUri: vscode.Uri): void {
		this._diagnosticCollection.delete(documentUri);
		this._lastResults.delete(documentUri.toString());
		this._onDidValidate.fire(documentUri);
	}

	/**
	 * Get the validation report as plain text.
	 */
	getReportAsText(documentUri: vscode.Uri): string | undefined {
		const result = this._lastResults.get(documentUri.toString());

		if (!result) {
			return undefined;
		}

		const lines: string[] = [];
		lines.push(`SHACL Validation Report`);
		lines.push(`Conforms: ${result.conforms}`);
		lines.push(`Results: ${result.results.length}`);
		lines.push('');

		for (const r of result.results) {
			lines.push(`  Focus Node: ${r.focusNode}`);
			lines.push(`  Severity:   ${this._severityLabel(r.severity)}`);

			if (r.path) {
				lines.push(`  Path:       ${r.path}`);
			}

			for (const msg of r.messages) {
				lines.push(`  Message:    ${msg}`);
			}

			if (r.value) {
				lines.push(`  Value:      ${r.value}`);
			}

			lines.push(`  Shape:      ${r.sourceShape}`);
			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Get the validation report as a Turtle string.
	 */
	async getReportAsTurtle(documentUri: vscode.Uri): Promise<string | undefined> {
		const result = this._lastResults.get(documentUri.toString());

		if (!result || !result.reportDataset) {
			return undefined;
		}

		// Use the store's serialization capabilities to write the report dataset as Turtle.
		const tempStore = new Store();
		const tempGraphUri = 'urn:shacl:report';

		for (const q of result.reportDataset) {
			tempStore.add(rdfFactory.quad(q.subject, q.predicate, q.object, rdfFactory.namedNode(tempGraphUri)));
		}

		return tempStore.serializeGraph(tempGraphUri, 'text/turtle', undefined, {
			'sh': _SH,
			'xsd': _XSD,
			'rdf': _RDF
		});
	}

	private _mapResults(results: any[]): ShaclValidationResultEntry[] {
		return results.map(r => ({
			focusNode: r.focusNode?.term?.value ?? r.focusNode?.value ?? '',
			severity: r.severity?.value ?? '',
			constraintComponent: r.constraintComponent?.value ?? '',
			messages: (r.message ?? []).map((m: any) => m.value ?? String(m)),
			path: r.path?.[0]?.predicates?.[0]?.value,
			value: r.value?.term?.value ?? r.value?.value,
			sourceShape: r.shape?.ptr?.term?.value ?? ''
		}));
	}

	private _publishDiagnostics(documentUri: vscode.Uri, context: IDocumentContext, result: ShaclValidationResult, quadContexts?: QuadContext[]): void {
		const diagnostics = this._diagnosticsMapper.mapToDiagnostics(result, context, quadContexts);
		this._diagnosticCollection.set(documentUri, diagnostics);
	}

	private _severityLabel(severity: string): string {
		if (severity.endsWith('Violation')) return 'Violation';
		if (severity.endsWith('Warning')) return 'Warning';
		if (severity.endsWith('Info')) return 'Info';
		return severity;
	}

	/**
	 * Migrates SHACL validation settings for renamed/moved files or folders.
	 *
	 * Keys in `mentor.shacl.validation` are workspace-relative `workspace:///...` URIs.
	 * Only renames for files whose old URI can be resolved to a workspace-relative URI
	 * are migrated — this prevents cross-workspace key contamination since the settings
	 * are stored globally and may contain keys from prior workspace sessions.
	 */
	async migrateShaclSettings(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void> {
		const renames: { oldKey: string; newKey: string }[] = [];

		for (const { oldUri, newUri } of files) {
			const oldWorkspaceUri = WorkspaceUri.toWorkspaceUri(oldUri);

			if (!oldWorkspaceUri) {
				// File is outside the current workspace root — skip to avoid
				// accidentally migrating keys from a different workspace session.
				continue;
			}

			const newWorkspaceUri = WorkspaceUri.toWorkspaceUri(newUri);
			const oldKey = WorkspaceUri.toCanonicalString(oldWorkspaceUri);
			const newKey = newWorkspaceUri
				? WorkspaceUri.toCanonicalString(newWorkspaceUri)
				: newUri.toString();

			renames.push({ oldKey, newKey });
		}

		if (renames.length === 0) {
			return;
		}

		const shacl = vscode.workspace.getConfiguration('mentor.shacl');
		const current = shacl.get<ShaclValidationConfiguration>('validation', {});
		const migrated = migrateShaclValidationConfig(current, renames);

		await shacl.update('validation', migrated, vscode.ConfigurationTarget.Global);
	}

	dispose(): void {
		this._diagnosticCollection.dispose();

		for (const d of this._disposables) {
			d.dispose();
		}
	}
}
