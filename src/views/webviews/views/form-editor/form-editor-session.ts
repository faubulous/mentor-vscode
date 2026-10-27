import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { isTemplate } from 'triplate';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { VocabularyRepository, rdf } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { IDocumentTokenSource } from '@src/services/document/document-token-source.interface';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { EditOperation, EditRejectionReason } from '@src/services/editing/edit-operation';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { Debouncer } from '@src/utilities/debounce';
import { getSubjectIconName } from '@src/utilities/subject-icon';
import { hasBlockingErrors } from '@src/utilities/vscode/diagnostic';
import { WebviewComponentFactory } from '../../webview-component-factory';
import { ExecuteCommandMessage } from '../../webview-messaging';
import { FocusHintResolver } from '../../services/editing/focus-hint-resolver';
import { ResourceIndex, ResourceIndexOptions } from '../../services/editing/resource-index';
import { ResourceViewBuilder } from '../../services/editing/resource-view-builder';
import { SnapshotBuilder } from '../../services/editing/snapshot-builder';
import { EditOutcome, FormEditorEditHandler } from './form-editor-edit-handler';
import { FormEditorHostMessage, FormEditorWebviewMessage, SnapshotCause } from './form-editor-messages';
import { DocumentProblem, DocumentSnapshot, ReadOnlyReason, ResourceDetail, ResourceId } from './form-editor-model';

/**
 * The delay before a snapshot is rebuilt after the document changed. The token source already
 * absorbs keystroke bursts, so this only coalesces the events that follow one delivery.
 */
const REFRESH_DELAY_MS = 120;

/**
 * How many problems of a document a snapshot points at.
 */
const MAX_PROBLEMS = 20;

/**
 * The syntaxes the form editor can read. N3 is excluded because its formulas and rules have no
 * representation in a property form.
 */
const SUPPORTED_SYNTAXES: ReadonlySet<RdfSyntax> = new Set([
	RdfSyntax.Turtle,
	RdfSyntax.TriG,
	RdfSyntax.NTriples,
	RdfSyntax.NQuads
]);

/**
 * The settings that change how a document is shown, which rebuild the snapshot when they change.
 */
const RENDERING_SETTINGS = ['mentor.formEditor', 'mentor.predicates', 'mentor.definitionTree.labelStyle', 'mentor.definitionTree.defaultLanguageTag'];

/**
 * The glyphs of IRIs the document does not describe, read from the store at one version of it.
 */
interface ObjectIconCache {
	/**
	 * The version of the store the glyphs were read at.
	 */
	version: number;

	/**
	 * The glyph of each IRI asked for, `undefined` when the store knows no type for it.
	 */
	icons: Map<string, string | undefined>;
}

/**
 * Serves one form editor tab. VS Code creates one webview panel per tab, so state is held per
 * session rather than per provider, and every subscription is disposed with the panel instead
 * of with the extension.
 */
export class FormEditorSession implements vscode.Disposable {
	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _refreshDebouncer = new Debouncer(REFRESH_DELAY_MS);

	private readonly _contextService: IDocumentContextService;

	private readonly _referenceProvider: ResourceReferenceProvider;

	private readonly _editHandler = new FormEditorEditHandler();

	private _tokenSource?: IDocumentTokenSource;

	private _index?: ResourceIndex;

	private _snapshot?: DocumentSnapshot;

	/**
	 * What the published snapshot was built from: the document version and its problems. The
	 * document context and the diagnostics announce changes without a new version, and a snapshot
	 * built from the same inputs again would be the same.
	 */
	private _snapshotKey?: string;

	/**
	 * Whether the webview said it is ready, so a snapshot posted to it is received. A snapshot
	 * built before is kept until then: posting it to a webview that is still loading only queues
	 * it, and the webview would receive and draw it twice.
	 */
	private _webviewReady = false;

	/**
	 * The snapshot last posted to the webview, which is not posted again.
	 */
	private _sentSnapshot?: DocumentSnapshot;

	private _objectIcons?: ObjectIconCache;

	private _disposed = false;

	/**
	 * Create the session of a tab.
	 * @param _context The extension context, used to resolve webview assets.
	 * @param _document The document being edited.
	 * @param _panel The webview panel created by VS Code for this tab.
	 */
	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _document: vscode.TextDocument,
		private readonly _panel: vscode.WebviewPanel
	) {
		this._contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		this._referenceProvider = new ResourceReferenceProvider(this._contextService);
	}

	/**
	 * The snapshot last built of the document, if any.
	 * @returns The snapshot.
	 */
	get snapshot(): DocumentSnapshot | undefined {
		return this._snapshot;
	}

	/**
	 * Render the webview and publish the first snapshot.
	 */
	async initialize(): Promise<void> {
		new WebviewComponentFactory(this._context, 'form-editor.js').configureWebview(this._panel.webview);

		// Let the page reach the webview before the document is loaded: loading a large one keeps
		// the extension host busy, and the webview would only start loading after it.
		await new Promise(resolve => setTimeout(resolve, 0));

		this._subscriptions.push(
			this._panel.webview.onDidReceiveMessage((message: FormEditorWebviewMessage) => this._onDidReceiveMessage(message)),
			this._panel.onDidChangeViewState(() => this._onDidChangeViewState()),
			vscode.languages.onDidChangeDiagnostics(event => this._onDidChangeDiagnostics(event)),
			vscode.workspace.onDidChangeConfiguration(event => this._onDidChangeConfiguration(event)),
			this._contextService.onDidChangeDocumentContext(context => {
				if (context?.uri.toString() === this._documentUri) {
					this._scheduleRefresh('external');
				}
			})
		);

		this._subscribeToTokenSource();
		this._subscribeToSettings();

		await this._contextService.activateContextForDocument(this._document);

		this._publishSnapshot('initial');
	}

	/**
	 * Reveal a resource in this editor.
	 * @param resourceId The resource to scroll to.
	 */
	revealResource(resourceId: ResourceId): void {
		this._postMessage({ id: 'ScrollToResource', resourceId });
	}

	/**
	 * Narrow this editor to the resources the definition tree lists under a node.
	 * @param label The label of the node.
	 * @param resourceIds The resources listed under it.
	 */
	filterResources(label: string, resourceIds: ResourceId[]): void {
		this._postMessage({ id: 'FilterResources', label, resourceIds });
	}

	/**
	 * Apply the operations of one user action to the document. The document is re-parsed
	 * synchronously afterwards and the new snapshot is published before the confirmation, so the
	 * webview never renders a confirmed edit against stale data. A stale edit gets a fresh
	 * snapshot along with the rejection, so the form catches up with the document.
	 * @param editId The identifier of the edit, echoed in the answer.
	 * @param baseVersion The document version the operations were built against.
	 * @param operations The operations.
	 * @returns The outcome.
	 */
	async applyEdit(editId: string, baseVersion: number, operations: EditOperation[]): Promise<EditOutcome> {
		const context = this._getTokenizedContext();

		if (!context) {
			return this._rejectEdit(editId, 'unsupportedSyntax', 'This document cannot be edited in the form editor.');
		}

		const outcome = await this._editHandler.handle({ editId, baseVersion, operations }, {
			document: this._document,
			context,
			tokenSource: this._tokenSource,
			readOnly: this._getReadOnlyReason(context)
		});

		if (!outcome.ok) {
			return this._rejectEdit(editId, outcome.reason, outcome.message);
		}

		this._refreshDebouncer.cancel();
		this._publishSnapshot('formEdit', editId);

		const focus = outcome.focus && this._index
			? new FocusHintResolver(this._index, context, this._getIndexOptions()).resolve(outcome.focus)
			: undefined;

		this._postMessage({ id: 'EditApplied', editId, version: outcome.version, focus, renamedIds: outcome.renamedIds });

		return outcome;
	}

	dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		this._refreshDebouncer.dispose();

		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}

		this._subscriptions.length = 0;
	}

	/**
	 * The string form of the document URI, used to filter events.
	 * @returns The URI.
	 */
	private get _documentUri(): string {
		return this._document.uri.toString();
	}

	/**
	 * Rebuild the snapshot when the token source delivers a parse of the document. An edit made
	 * through the form is published right away; the debounced delivery that follows it carries
	 * nothing new.
	 */
	private _subscribeToTokenSource(): void {
		if (!container.isRegistered(ServiceToken.DocumentTokenSource)) {
			return;
		}

		this._tokenSource = container.resolve<IDocumentTokenSource>(ServiceToken.DocumentTokenSource);

		this._subscriptions.push(
			this._tokenSource.onDidDeliverTokens(delivery => {
				if (delivery.uri === this._documentUri && this._snapshot?.version !== this._document.version) {
					this._scheduleRefresh('external');
				}
			})
		);
	}

	/**
	 * Rebuild the snapshot when the language the labels are read in changes.
	 */
	private _subscribeToSettings(): void {
		if (!container.isRegistered(ServiceToken.SettingsService)) {
			return;
		}

		const settings = container.resolve<ISettingsService>(ServiceToken.SettingsService);

		this._subscriptions.push(settings.onDidChange('view.activeLanguage', () => this._scheduleRefresh('language')));
	}

	/**
	 * Handle a message from the webview.
	 * @param message The message.
	 */
	private async _onDidReceiveMessage(message: FormEditorWebviewMessage): Promise<void> {
		switch (message.id) {
			case 'Ready':
				// A webview loaded anew, after it was hidden, has none of the snapshots sent before.
				this._webviewReady = true;
				this._sentSnapshot = undefined;
				this._publishSnapshot('initial');
				break;
			case 'RequestResources':
				this._publishResources(message.ids);
				break;
			case 'ApplyEdit':
				await this.applyEdit(message.editId, message.baseVersion, message.operations);
				break;
			case 'RevealInTextEditor':
				await this._revealInTextEditor(message.position.line, message.position.character);
				break;
			case 'ExecuteCommand': {
				const command = message as ExecuteCommandMessage;

				await vscode.commands.executeCommand(command.command, ...(command.args ?? []));
				break;
			}
			default:
				break;
		}
	}

	/**
	 * Keep the document context of the focused tab active so that the definition tree and the
	 * language selection follow the document the user is looking at.
	 */
	private _onDidChangeViewState(): void {
		if (this._panel.active) {
			void this._contextService.activateContextForDocument(this._document);
		}
	}

	/**
	 * Refresh when the problems of this document changed, because they decide whether the
	 * document can be edited.
	 * @param event The diagnostics that changed.
	 */
	private _onDidChangeDiagnostics(event: vscode.DiagnosticChangeEvent): void {
		if (event.uris.some(uri => uri.toString() === this._documentUri)) {
			this._scheduleRefresh('external');
		}
	}

	/**
	 * Refresh when a setting that affects rendering changed.
	 * @param event The configuration that changed.
	 */
	private _onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): void {
		if (RENDERING_SETTINGS.some(section => event.affectsConfiguration(section))) {
			this._scheduleRefresh('settings');
		}
	}

	/**
	 * Schedule a snapshot, coalescing the events that follow one document change.
	 * @param cause Why the snapshot is rebuilt.
	 */
	private _scheduleRefresh(cause: SnapshotCause): void {
		if (!this._disposed) {
			this._refreshDebouncer.schedule(() => this._publishSnapshot(cause));
		}
	}

	/**
	 * Build and post a snapshot of the document.
	 * @param cause Why the snapshot is sent.
	 * @param editId The edit of the form that caused it, if any.
	 */
	private _publishSnapshot(cause: SnapshotCause, editId?: string): void {
		if (this._disposed) {
			return;
		}

		const context = this._getTokenizedContext();

		if (!context) {
			const readOnly: ReadOnlyReason = { reason: 'unsupportedSyntax', message: 'This document cannot be shown in the form editor.' };

			this._postMessage({ id: 'DocumentSnapshot', cause, editId, snapshot: this._buildEmptySnapshot(readOnly) });

			return;
		}

		const readOnly = this._getReadOnlyReason(context);
		const problems = this._collectProblems();
		const key = `${this._document.version}|${readOnly?.reason ?? ''}|${JSON.stringify(problems)}`;

		if (!this._reuseSnapshot(cause, key)) {
			this._rebuildSnapshot(context, readOnly, problems, key);
		}

		this._sendSnapshot(cause, editId);
	}

	/**
	 * Build the snapshot of the current document version and keep it, with the index it was built
	 * from, for the details the webview asks for.
	 * @param context The context of the document.
	 * @param readOnly Why the document cannot be edited, if it cannot.
	 * @param problems The problems of the document.
	 * @param key What the snapshot is built from.
	 */
	private _rebuildSnapshot(context: TurtleDocument, readOnly: ReadOnlyReason | undefined, problems: DocumentProblem[], key: string): void {
		const result = new SnapshotBuilder({
			version: this._document.version,
			uri: this._documentUri,
			quadContexts: readOnly?.reason === 'template' ? [] : context.getQuadContexts(),
			context,
			readOnly,
			problems,
			countUsages: iri => this._countUsages(iri)
		}).build();

		this._index = result.index;
		this._snapshot = result.snapshot;
		this._snapshotKey = key;
	}

	/**
	 * Post the kept snapshot, once the webview is ready and unless it was posted already.
	 * @param cause Why the snapshot is sent.
	 * @param editId The edit of the form that caused it, if any.
	 */
	private _sendSnapshot(cause: SnapshotCause, editId?: string): void {
		const snapshot = this._snapshot;

		if (!snapshot || !this._webviewReady || snapshot === this._sentSnapshot) {
			return;
		}

		this._sentSnapshot = snapshot;
		this._postMessage({ id: 'DocumentSnapshot', cause, editId, snapshot });
	}

	/**
	 * Keep the snapshot when it was built from the same document version and problems: a change
	 * of the document context or of the diagnostics without a new version is no reason to rebuild
	 * it, and a webview that asks again is sent the one already built. A change of the settings or
	 * the language always rebuilds, as it changes how the same document is shown.
	 * @param cause Why the snapshot is sent.
	 * @param key What the snapshot would be built from.
	 * @returns Whether the snapshot was kept.
	 */
	private _reuseSnapshot(cause: SnapshotCause, key: string): boolean {
		return this._snapshot !== undefined && key === this._snapshotKey && (cause === 'external' || cause === 'initial');
	}

	/**
	 * Post the properties of the requested resources.
	 * @param ids The resources.
	 */
	private _publishResources(ids: ResourceId[]): void {
		const context = this._getTokenizedContext();

		if (!this._index || !this._snapshot || !context) {
			return;
		}

		const views = new ResourceViewBuilder(this._index, context, this._getIndexOptions());
		const resources: ResourceDetail[] = [];
		const missing: ResourceId[] = [];

		for (const id of ids) {
			const entry = this._index.entries.get(id);

			if (entry) {
				resources.push(views.buildDetail(entry));
			} else {
				missing.push(id);
			}
		}

		this._postMessage({ id: 'ResourcesLoaded', version: this._snapshot.version, resources, missing });
	}

	/**
	 * How often a resource is referred to across the indexed documents, not counting the statement
	 * that defines it, as the usage code lens counts.
	 * @param iri The IRI of the resource.
	 * @returns The count.
	 */
	private _countUsages(iri: string): number {
		return Math.max(this._referenceProvider.countReferencesForIri(iri) - 1, 0);
	}

	/**
	 * Options for building resource details: the glyphs of the IRIs the document only mentions
	 * come from the store, when there is one.
	 * @returns The options.
	 */
	private _getIndexOptions(): ResourceIndexOptions {
		const vocabulary = container.isRegistered(ServiceToken.VocabularyRepository)
			? container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository)
			: undefined;

		return { resolveObjectIcon: vocabulary ? iri => this._resolveObjectIcon(vocabulary, iri) : undefined };
	}

	/**
	 * The glyph of an IRI the document does not describe, from its types in the store. Memoized
	 * until the store changes, because a snapshot asks for the same vocabulary terms over and over.
	 * @param vocabulary The vocabulary repository over the store.
	 * @param iri The IRI.
	 * @returns The glyph, or `undefined` when the store knows no type for the IRI.
	 */
	private _resolveObjectIcon(vocabulary: VocabularyRepository, iri: string): string | undefined {
		const store = vocabulary.store;

		if (!this._objectIcons || this._objectIcons.version !== store.version) {
			this._objectIcons = { version: store.version, icons: new Map() };
		}

		const icons = this._objectIcons.icons;

		if (icons.has(iri)) {
			return icons.get(iri);
		}

		const types: string[] = [];

		for (const quad of store.matchAll(undefined, store.dataFactory.namedNode(iri), rdf.type, null, false)) {
			if (quad.object.termType === 'NamedNode') {
				types.push(quad.object.value);
			}
		}

		const icon = types.length > 0 ? getSubjectIconName(types) : undefined;

		icons.set(iri, icon);

		return icon;
	}

	/**
	 * Tell the webview that an edit was not applied. A stale edit gets a fresh snapshot along
	 * with the rejection, so the form catches up with the document.
	 * @param editId The identifier of the edit.
	 * @param reason Why the edit was not applied.
	 * @param message The explanation shown to the user.
	 * @returns The outcome.
	 */
	private _rejectEdit(editId: string, reason: EditRejectionReason, message: string): EditOutcome {
		this._postMessage({ id: 'EditRejected', editId, reason, message, version: this._document.version });

		if (reason === 'staleVersion') {
			this._publishSnapshot('external');
		}

		return { ok: false, reason, message };
	}

	/**
	 * Show a position of the document in a text editor beside the form.
	 * @param line The line, zero based.
	 * @param character The character within the line, zero based.
	 */
	private async _revealInTextEditor(line: number, character: number): Promise<void> {
		const position = new vscode.Position(Math.max(0, line), Math.max(0, character));

		await vscode.window.showTextDocument(this._document, {
			viewColumn: vscode.ViewColumn.Beside,
			selection: new vscode.Range(position, position)
		});
	}

	/**
	 * Get the document context when it can back a form.
	 * @returns The context, or `undefined` when the document has none or its syntax is not supported.
	 */
	private _getTokenizedContext(): TurtleDocument | undefined {
		const context = this._contextService.contexts[this._documentUri];

		if (!(context instanceof TurtleDocument)) {
			return undefined;
		}

		return SUPPORTED_SYNTAXES.has(context.syntax) ? context : undefined;
	}

	/**
	 * Determine whether the document can be edited through the form.
	 * @param context The context of the document.
	 * @returns Why it cannot, or `undefined` when it can.
	 */
	private _getReadOnlyReason(context: TurtleDocument): ReadOnlyReason | undefined {
		if (isTemplate(this._document.getText())) {
			return {
				reason: 'template',
				message: 'Triplate templates cannot be shown in the form editor because their structure is generated.'
			};
		}

		if (hasBlockingErrors(this._document.uri)) {
			return {
				reason: 'syntaxErrors',
				message: 'This document has syntax errors. Fix them in the text editor to continue editing here.'
			};
		}

		if (!context.getQuadContexts().length && this._document.getText().trim().length > 0) {
			return {
				reason: 'syntaxErrors',
				message: 'This document could not be parsed. Open it in the text editor to see the problem.'
			};
		}

		return undefined;
	}

	/**
	 * Collect the error problems of the document, so the form can point at them.
	 * @returns The problems.
	 */
	private _collectProblems(): DocumentProblem[] {
		return vscode.languages.getDiagnostics(this._document.uri)
			.filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
			.slice(0, MAX_PROBLEMS)
			.map(diagnostic => ({
				message: diagnostic.message,
				line: diagnostic.range.start.line,
				character: diagnostic.range.start.character
			}));
	}

	/**
	 * Build a snapshot for a document that cannot be rendered.
	 * @param readOnly Why the document cannot be rendered.
	 * @returns The snapshot.
	 */
	private _buildEmptySnapshot(readOnly: ReadOnlyReason): DocumentSnapshot {
		return {
			version: this._document.version,
			uri: this._documentUri,
			fileName: this._document.uri.path.split('/').pop() ?? '',
			syntax: this._document.languageId,
			namespaces: [],
			annotationScheme: {},
			resources: [],
			datatypes: [],
			readOnly,
			problems: this._collectProblems()
		};
	}

	/**
	 * Post a message to the webview.
	 * @param message The message.
	 */
	private _postMessage(message: FormEditorHostMessage): void {
		if (!this._disposed) {
			void this._panel.webview.postMessage(message);
		}
	}
}
