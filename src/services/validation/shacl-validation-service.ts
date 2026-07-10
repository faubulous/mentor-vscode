import * as vscode from 'vscode';
import { DataFactory as N3DataFactory } from 'n3';
import { DatasetCore, Quad, Term } from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { Validator } from 'shacl-engine';
import { Store } from '@faubulous/mentor-rdf';
import { IDocumentContextService, IDocumentFactory } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getConfig } from '@src/utilities/vscode/config';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { ShaclDiagnosticsMapper } from './shacl-diagnostics-mapper';
import {
	findBrokenReferences,
	getAllReferencedShapeUris,
	getDocumentValidationState,
	getPathPatternBase,
	hasBrokenReferences,
	migrateShaclValidationConfig,
	resolveEffectiveShapeGraphs,
	ShaclBrokenReferences,
	ShaclDocumentLocation,
	ShaclDocumentRename,
	ShaclDocumentValidationState,
	ShaclValidationSettings,
	toUniqueStringArray,
} from './shacl-validation-configuration';

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
		for (const _ of this) n++;
		return n;
	}

	add(_quad: Quad): this { return this; }
	delete(_quad: Quad): this { return this; }

	has(quad: Quad): boolean {
		for (const q of this) {
			if (q.equals(quad)) return true;
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
	 * Ensures the startup profile health check runs at most once per session.
	 */
	private _startupProfileCheckDone = false;

	/**
	 * Fired when a validation completes (or results are cleared) for a document.
	 */
	readonly onDidValidate: vscode.Event<vscode.Uri> = this._onDidValidate.event;

	constructor(
		context: vscode.ExtensionContext,
		private readonly _store: Store,
		private readonly _contextService: IDocumentContextService,
		private readonly _documentFactory: IDocumentFactory
	) {
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-shacl');
		this._diagnosticsMapper = new ShaclDiagnosticsMapper();

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
	 * Get the current SHACL validation settings, merging profiles and document
	 * assignments across the user and workspace scopes (workspace overrides user
	 * on a name/key conflict). Profiles can live in either scope, mirroring how
	 * SPARQL stores and connections are resolved.
	 */
	getValidationSettings(): ShaclValidationSettings {
		const inspected = getConfig('shacl').inspect<ShaclValidationSettings>('validation');

		if (!inspected) {
			return getConfig('shacl').get<ShaclValidationSettings>('validation', {});
		}

		const scopes = [inspected.defaultValue, inspected.globalValue, inspected.workspaceValue];

		return {
			profiles: Object.assign({}, ...scopes.map(s => s?.profiles ?? {})),
		};
	}

	/**
	 * Get the workspace-relative location of a document, as matched against the
	 * `documents` and `paths` settings keys. Documents outside the workspace get
	 * an inert location (their full URI as the path) that nothing matches.
	 */
	getDocumentLocation(documentUri: vscode.Uri): ShaclDocumentLocation {
		const wsUri = WorkspaceUri.toWorkspaceUri(documentUri);

		if (!wsUri) {
			return { path: documentUri.toString() };
		}

		return {
			path: wsUri.path.replace(/^\/+/, ''),
			fragment: wsUri.fragment || undefined,
		};
	}

	/**
	 * Get the currently-recognized RDF file extensions (e.g. `.ttl`), used to
	 * narrow extension-less `paths` patterns to RDF files.
	 */
	getRdfExtensions(): string[] {
		return Object.entries(this._documentFactory.supportedExtensions)
			.filter(([, info]) => info.isTripleSource)
			.map(([extension]) => extension);
	}

	/**
	 * Get the effective shape graph URIs for a given document.
	 */
	getEffectiveShapeGraphs(documentUri: vscode.Uri): string[] {
		return resolveEffectiveShapeGraphs(this.getValidationSettings(), this.getDocumentLocation(documentUri), this.getRdfExtensions());
	}

	/**
	 * Get the fully-resolved validation state of a document, including the
	 * applied profile ids, for UI purposes such as code lenses.
	 */
	getDocumentValidationState(documentUri: vscode.Uri): ShaclDocumentValidationState {
		return getDocumentValidationState(this.getValidationSettings(), this.getDocumentLocation(documentUri), this.getRdfExtensions());
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
			this._publishDiagnostics(documentUri, context, result);
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
			'sh': 'http://www.w3.org/ns/shacl#',
			'xsd': 'http://www.w3.org/2001/XMLSchema#',
			'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
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

	private _publishDiagnostics(documentUri: vscode.Uri, context: IDocumentContext, result: ShaclValidationResult): void {
		const diagnostics = this._diagnosticsMapper.mapToDiagnostics(result, context);
		this._diagnosticCollection.set(documentUri, diagnostics);
	}

	private _severityLabel(severity: string): string {
		if (severity.endsWith('Violation')) return 'Violation';
		if (severity.endsWith('Warning')) return 'Warning';
		if (severity.endsWith('Info')) return 'Info';
		return severity;
	}

	/**
	 * Checks all validation profiles and document assignments for broken references:
	 * shape files that no longer exist and assignments naming unknown profiles.
	 */
	async checkShaclProfiles(): Promise<ShaclBrokenReferences> {
		const settings = this.getValidationSettings();
		const existing = new Set<string>();

		for (const uri of getAllReferencedShapeUris(settings)) {
			if (await this._shapeFileExists(uri)) {
				existing.add(uri);
			}
		}

		return findBrokenReferences(settings, uri => existing.has(uri));
	}

	/**
	 * Runs the startup health check once per session: if any profile or assignment
	 * references missing files or unknown profiles, shows a warning with an action
	 * to open the validation settings.
	 */
	async runStartupProfileCheck(): Promise<void> {
		if (this._startupProfileCheckDone || !getConfig('shacl').get<boolean>('enabled', false)) {
			return;
		}

		this._startupProfileCheckDone = true;

		const broken = await this.checkShaclProfiles();

		if (!hasBrokenReferences(broken)) {
			return;
		}

		const brokenProfiles = Object.keys(broken.profiles);

		const action = await vscode.window.showWarningMessage(
			`Some SHACL validation profiles reference missing shape graphs. Affected profiles: ${brokenProfiles.join(', ')}`,
			'Manage Profiles'
		);

		if (action === 'Manage Profiles') {
			await vscode.commands.executeCommand('mentor.command.openSettings', 'validation.profiles');
		}
	}

	/**
	 * Migrates SHACL validation settings for renamed/moved files or folders.
	 *
	 * Shape entries in `mentor.shacl.validation` are canonical
	 * `workspace:///...` URIs while `documents`/`paths` keys are bare
	 * workspace-relative paths, so each rename carries both forms. Only renames
	 * for files whose old URI can be resolved to a workspace-relative URI are
	 * migrated.
	 */
	async migrateShaclSettings(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void> {
		const renames: ShaclDocumentRename[] = [];

		for (const { oldUri, newUri } of files) {
			const oldWorkspaceUri = WorkspaceUri.toWorkspaceUri(oldUri);

			if (!oldWorkspaceUri) {
				// File is outside the current workspace root — skip.
				continue;
			}

			const newWorkspaceUri = WorkspaceUri.toWorkspaceUri(newUri);

			renames.push({
				oldUri: WorkspaceUri.toCanonicalString(oldWorkspaceUri),
				newUri: newWorkspaceUri
					? WorkspaceUri.toCanonicalString(newWorkspaceUri)
					: newUri.toString(),
				oldPath: oldWorkspaceUri.path.replace(/^\/+/, ''),
				newPath: newWorkspaceUri
					? newWorkspaceUri.path.replace(/^\/+/, '')
					: newUri.toString(),
			});
		}

		if (renames.length === 0) {
			return;
		}

		const shacl = vscode.workspace.getConfiguration('mentor.shacl');
		const current = shacl.inspect<ShaclValidationSettings>('validation')?.workspaceValue;

		if (!current) {
			return;
		}

		const migrated = migrateShaclValidationConfig(current, renames);

		await shacl.update('validation', migrated, vscode.ConfigurationTarget.Workspace);
	}

	/**
	 * Handles file/folder deletions:
	 * - Prunes `paths` entries whose literal path or fixed pattern prefix lies
	 *   inside a deleted path (they can never match anything again). Root-anchored
	 *   patterns are left untouched.
	 * - Warns — without modifying shape lists — when a deleted file is still
	 *   referenced as a shape file by a profile.
	 */
	async handleFileDeletes(files: ReadonlyArray<vscode.Uri>): Promise<void> {
		// Shape entries are canonical workspace:/// URIs, paths entries are bare
		// relative paths — collect the deletions in both forms.
		const deletedUris: string[] = [];
		const deletedPaths: string[] = [];

		for (const uri of files) {
			const wsUri = WorkspaceUri.toWorkspaceUri(uri);

			if (wsUri) {
				deletedUris.push(WorkspaceUri.toCanonicalString(wsUri));
				deletedPaths.push(wsUri.path.replace(/^\/+/, ''));
			}
		}

		if (deletedPaths.length === 0) {
			return;
		}

		// Deletions may be folders; match by key or path prefix with boundary guards.
		const isDeletedUri = (uri: string) =>
			deletedUris.some(key => uri === key || uri.startsWith(key + '/'));

		const isDeletedPathEntry = (entry: string) => {
			const pattern = entry.startsWith('!') ? entry.slice(1) : entry;
			const base = getPathPatternBase(pattern);

			return base.length > 0 && deletedPaths.some(path =>
				base === path || base.startsWith(path + '/') || base.startsWith(path + '#'));
		};

		const shacl = vscode.workspace.getConfiguration('mentor.shacl');
		const settings = shacl.inspect<ShaclValidationSettings>('validation')?.workspaceValue;

		if (!settings) {
			return;
		}

		let changed = false;
		const profiles = { ...(settings.profiles ?? {}) };

		for (const [id, profile] of Object.entries(profiles)) {
			const paths = profile?.paths;

			if (!paths?.length) {
				continue;
			}

			const kept = paths.filter(entry => !isDeletedPathEntry(entry));

			if (kept.length !== paths.length) {
				const next = { ...profile };

				if (kept.length > 0) {
					next.paths = kept;
				} else {
					delete next.paths;
				}

				profiles[id] = next;
				changed = true;
			}
		}

		if (changed) {
			await shacl.update('validation', { ...settings, profiles }, vscode.ConfigurationTarget.Workspace);
		}

		// Warn about profiles that reference deleted shape files.
		const affectedProfiles = Object.entries(profiles)
			.filter(([, profile]) => toUniqueStringArray(profile?.shapes).some(isDeletedUri))
			.map(([id]) => id);

		if (affectedProfiles.length === 0) {
			return;
		}

		const action = await vscode.window.showWarningMessage(
			`Deleted files are still referenced as shape graphs by SHACL validation profiles. Affected profiles: ${affectedProfiles.join(', ')}`,
			'Manage Profiles'
		);

		if (action === 'Manage Profiles') {
			await vscode.commands.executeCommand('mentor.command.openSettings', 'validation.profiles');
		}
	}

	/**
	 * Checks whether a shape file URI exists: `workspace:` URIs are resolved
	 * against the file system, other URIs are looked up as graphs in the store.
	 */
	private async _shapeFileExists(uri: string): Promise<boolean> {
		let parsed: vscode.Uri;

		try {
			parsed = vscode.Uri.parse(uri, true);
		} catch {
			return false;
		}

		if (parsed.scheme === WorkspaceUri.uriScheme) {
			const fileUri = WorkspaceUri.tryToFileUri(parsed);

			if (!fileUri) {
				return false;
			}

			try {
				await vscode.workspace.fs.stat(fileUri);
				return true;
			} catch {
				return false;
			}
		}

		return this._store.hasGraph(uri);
	}

	dispose(): void {
		this._diagnosticCollection.dispose();

		for (const d of this._disposables) {
			d.dispose();
		}
	}
}
