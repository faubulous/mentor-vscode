import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { isTemplate } from 'triplate';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { VocabularyRepository, rdf } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { IDocumentTokenSource } from '@src/services/document/document-token-source.interface';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { EditOperation } from '@src/services/editing/edit-operation';
import { getLog } from '@src/utilities/vscode/log';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { getSubjectIconName } from '@src/utilities/subject-icon';
import { tokensMatchText } from '@src/utilities/tokens';
import { DocumentSyntaxError } from '@src/services/document/document-syntax-error';
import { WebviewComponentFactory } from '../../webview-component-factory';
import { ExecuteCommandMessage } from '../../webview-messaging';
import { ResourceIndex, ResourceIndexOptions, findCardResource, getEntry } from '../../services/editing/resource-index';
import { ResourceViewBuilder } from '../../services/editing/resource-view-builder';
import { SnapshotBuilder } from '../../services/editing/snapshot-builder';
import { EditOutcome, FormEditorEditHandler } from './form-editor-edit-handler';
import { FormEditorHostMessage, FormEditorWebviewMessage } from './form-editor-messages';
import { getFormReadOnlyReason } from './form-editor-read-only';
import { DocumentProblem, DocumentSnapshot, ReadOnlyReason, ResourceDetail } from './form-editor-model';
import { QuadContextCache } from './quad-context-cache';
import { reviveTerms } from '@src/utilities/rdf-terms';


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

	private readonly _contextService: IDocumentContextService;

	private readonly _referenceProvider: ResourceReferenceProvider;

	private readonly _editHandler = new FormEditorEditHandler();

	private readonly _quadContexts = new QuadContextCache();

	private _tokenSource?: IDocumentTokenSource;

	private _index?: ResourceIndex;

	private _snapshot?: DocumentSnapshot;

	/**
	 * What the published snapshot was built from: the document version, its problems and the
	 * version of the store its labels and glyphs were read from. A snapshot built from the same
	 * inputs again would be the same; a change of the settings clears it.
	 */
	private _snapshotKey?: string;

	/**
	 * How many snapshots were built, which numbers their revisions.
	 */
	private _revision = 0;

	/**
	 * Whether a refresh waits for the document to load, which answers the refreshes asked for
	 * meanwhile.
	 */
	private _refreshPending = false;

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

		// Let the page reach the webview before the document is loaded. The extension host sends its
		// messages to the workbench from a timer of its own, which runs before this one; loading a
		// large document keeps the host busy, and the webview would only start loading after it.
		await new Promise(resolve => setTimeout(resolve, 0));

		this._subscriptions.push(
			// Messages arrive as plain data; the RDF/JS terms of an edit are revived before it is read.
			this._panel.webview.onDidReceiveMessage((message: FormEditorWebviewMessage) => this._onDidReceiveMessage(reviveTerms(message))),
			this._panel.onDidChangeViewState(() => this._onDidChangeViewState()),
			vscode.workspace.onDidChangeConfiguration(event => this._onDidChangeConfiguration(event)),
			this._contextService.onDidChangeDocumentContext(context => {
				if (context?.uri.toString() === this._documentUri) {
					void this._refreshWhenLoaded();
				}
			})
		);

		this._subscribeToTokenSource();
		this._subscribeToSettings();

		await this._contextService.activateContextForDocument(this._document);

		this._publishSnapshot();
	}

	/**
	 * Reveal a resource in this editor: its own card, or the card it is written in.
	 * @param resource The resource to scroll to.
	 */
	revealResource(resource: NamedNode | BlankNode): void {
		const card = this._cardResourceOf(resource);

		if (card) {
			this._postMessage({ id: 'ScrollToResource', resource: card });
		}
	}

	/**
	 * Narrow this editor to the resources the definition tree lists under a node: their own cards,
	 * or the cards they are written in.
	 * @param label The label of the node.
	 * @param resources The resources listed under it.
	 */
	filterResources(label: string, resources: (NamedNode | BlankNode)[]): void {
		const cards = new Map<string, NamedNode | BlankNode>();

		for (const resource of resources) {
			const card = this._cardResourceOf(resource);

			if (card) {
				cards.set(termToString(card), card);
			}
		}

		this._postMessage({ id: 'FilterResources', label, resources: Array.from(cards.values()) });
	}

	/**
	 * Find the resource whose card shows a resource. Before the document is indexed, every resource
	 * is taken to have a card of its own.
	 * @param resource The resource.
	 * @returns The resource with the card, or `undefined` when the document shows no card for it.
	 */
	private _cardResourceOf(resource: NamedNode | BlankNode): NamedNode | BlankNode | undefined {
		return this._index ? findCardResource(this._index, resource) : resource;
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
			return this._rejectEdit(editId, { ok: false, problem: { kind: 'readOnly' }, detail: 'The document has no tokenized context.' });
		}

		const outcome = await this._editHandler.handle({ editId, baseVersion, operations }, {
			document: this._document,
			context,
			tokenSource: this._tokenSource,
			quadContexts: this._quadContexts
		});

		if (!outcome.ok) {
			return this._rejectEdit(editId, outcome);
		}

		this._publishSnapshot();

		this._postMessage({ id: 'EditApplied', editId, version: outcome.version });

		return outcome;
	}

	dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;

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
	 * Rebuild the snapshot when the token source delivers a parse of the document, once its
	 * triples are loaded. The parse of an edit made through the form is published right away; the
	 * delivery that follows it brings the labels read from the reloaded store.
	 */
	private _subscribeToTokenSource(): void {
		if (!container.isRegistered(ServiceToken.DocumentTokenSource)) {
			return;
		}

		this._tokenSource = container.resolve<IDocumentTokenSource>(ServiceToken.DocumentTokenSource);

		this._subscriptions.push(
			this._tokenSource.onDidDeliverTokens(delivery => {
				if (delivery.uri === this._documentUri) {
					void this._refreshWhenLoaded();
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

		this._subscriptions.push(settings.onDidChange('view.activeLanguage', () => this._rebuildWhenLoaded()));
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
				this._publishSnapshot();
				break;
			case 'RequestResources':
				this._publishResources(message.resources);
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
	 * Refresh when a setting that affects rendering changed.
	 * @param event The configuration that changed.
	 */
	private _onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): void {
		if (RENDERING_SETTINGS.some(section => event.affectsConfiguration(section))) {
			this._rebuildWhenLoaded();
		}
	}

	/**
	 * Rebuild the snapshot even from the same inputs, as a change of the settings or the language
	 * changes how the same document is shown.
	 */
	private _rebuildWhenLoaded(): void {
		this._snapshotKey = undefined;

		void this._refreshWhenLoaded();
	}

	/**
	 * Publish a snapshot once the document is loaded. The triples of a parse are loaded into the
	 * store after the parse is delivered, and the labels and glyphs of a snapshot are read from the
	 * store, so a snapshot built before would show those of the text before. A refresh asked for
	 * while one waits is answered by it.
	 */
	private async _refreshWhenLoaded(): Promise<void> {
		if (this._refreshPending || this._disposed) {
			return;
		}

		this._refreshPending = true;

		try {
			while (this._contextService.isLoading(this._documentUri)) {
				await this._contextService.waitUntilLoaded(this._documentUri);
			}
		} finally {
			this._refreshPending = false;
		}

		this._publishSnapshot();
	}

	/**
	 * Build and post a snapshot of the document, unless the one built last was built from the
	 * same inputs.
	 */
	private _publishSnapshot(): void {
		if (this._disposed) {
			return;
		}

		const context = this._getTokenizedContext();

		if (!context) {
			this._postMessage({ id: 'DocumentSnapshot', snapshot: this._buildEmptySnapshot('unsupportedSyntax') });

			return;
		}

		const text = this._document.getText();

		// The parse of an earlier text: its offsets are not those of this version, so the snapshot
		// of the last parse stays until the parse of this version is delivered. A template is shown
		// without its statements, and so without offsets.
		if (!isTemplate(text) && !tokensMatchText(context.tokens, text)) {
			this._sendSnapshot();

			return;
		}

		const syntaxErrors = context.getSyntaxErrors(text);
		const readOnly = getFormReadOnlyReason(text, syntaxErrors);
		const problems = this._toProblems(syntaxErrors);
		const key = `${this._document.version}|${this._getVocabulary()?.store.version ?? ''}|${readOnly ?? ''}|${JSON.stringify(problems)}`;

		if (!this._snapshot || key !== this._snapshotKey) {
			this._rebuildSnapshot(context, readOnly, problems, key);
		}

		this._sendSnapshot();
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
			revision: ++this._revision,
			uri: this._documentUri,
			quadContexts: readOnly === 'template' ? [] : this._quadContexts.get(context),
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
	 */
	private _sendSnapshot(): void {
		const snapshot = this._snapshot;

		if (!snapshot || !this._webviewReady || snapshot === this._sentSnapshot) {
			return;
		}

		this._sentSnapshot = snapshot;
		this._postMessage({ id: 'DocumentSnapshot', snapshot });
	}

	/**
	 * Post the properties of the requested resources.
	 * @param requested The resources.
	 */
	private _publishResources(requested: (NamedNode | BlankNode)[]): void {
		const context = this._getTokenizedContext();

		if (!this._index || !this._snapshot || !context) {
			return;
		}

		const views = new ResourceViewBuilder(this._index, context, this._getIndexOptions());
		const resources: ResourceDetail[] = [];
		const missing: (NamedNode | BlankNode)[] = [];

		for (const resource of requested) {
			const entry = getEntry(this._index, resource);

			if (entry) {
				resources.push(views.buildDetail(entry));
			} else {
				missing.push(resource);
			}
		}

		this._postMessage({ id: 'ResourcesLoaded', revision: this._snapshot.revision, resources, missing });
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
		const vocabulary = this._getVocabulary();

		return { resolveObjectIcon: vocabulary ? iri => this._resolveObjectIcon(vocabulary, iri) : undefined };
	}

	/**
	 * The vocabulary repository over the store, when there is one.
	 * @returns The repository.
	 */
	private _getVocabulary(): VocabularyRepository | undefined {
		return container.isRegistered(ServiceToken.VocabularyRepository)
			? container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository)
			: undefined;
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
	 * What the host knows beyond the problem is logged, as it helps to tell why an edit failed.
	 * @param editId The identifier of the edit.
	 * @param outcome The rejection.
	 * @returns The outcome.
	 */
	private _rejectEdit(editId: string, outcome: Extract<EditOutcome, { ok: false }>): EditOutcome {
		const { problem, detail } = outcome;

		getLog().info(`Form editor edit rejected (${problem.kind}) in ${this._document.uri.toString()}${detail ? `: ${detail}` : ''}`);

		this._postMessage({ id: 'EditRejected', editId, problem, version: this._document.version });

		if (problem.kind === 'staleVersion') {
			this._publishSnapshot();
		}

		return outcome;
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
	 * Name the places where the text does not parse, so the form can point at them.
	 * @param syntaxErrors The syntax errors of the text.
	 * @returns The problems, the first few of them.
	 */
	private _toProblems(syntaxErrors: readonly DocumentSyntaxError[]): DocumentProblem[] {
		return syntaxErrors.slice(0, MAX_PROBLEMS).map(error => {
			const position = this._document.positionAt(error.offset);

			return { message: error.message, line: position.line, character: position.character };
		});
	}

	/**
	 * Build a snapshot for a document that cannot be rendered.
	 * @param readOnly Why the document cannot be rendered.
	 * @returns The snapshot.
	 */
	private _buildEmptySnapshot(readOnly: ReadOnlyReason): DocumentSnapshot {
		return {
			version: this._document.version,
			revision: ++this._revision,
			uri: this._documentUri,
			fileName: this._document.uri.path.split('/').pop() ?? '',
			namespaces: [],
			resources: [],
			languageTags: {},
			readOnly,
			problems: []
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
