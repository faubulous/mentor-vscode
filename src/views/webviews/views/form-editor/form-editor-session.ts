import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { isTemplate } from 'triplate';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { RdfSyntax, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { OWL, RDF, RDFS, VocabularyRepository, rdf } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { LanguageSelection, SelectActiveLanguageOptions, selectActiveLanguage } from '@src/commands/document/select-active-language';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { IDocumentTokenSource } from '@src/services/document/document-token-source.interface';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { EditOperation } from '@src/services/editing/edit-operation';
import { StatementValue } from '@src/services/editing/statement-value';
import { LocalPartCase, getLocalPartFromLabel } from '@src/utilities/uri';
import { getLog } from '@src/utilities/vscode/log';
import { getConfig, toConfigurationTarget } from '@src/utilities/vscode/config';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { getSubjectIconName } from '@src/utilities/subject-icon';
import { getBlankNodeSpan, getTokenAtPosition, tokensMatchText } from '@src/utilities/tokens';
import { isPlainLocalName } from '@src/utilities/prefixed-name';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { DocumentSyntaxError } from '@src/services/document/document-syntax-error';
import { WebviewComponentFactory } from '../../webview-component-factory';
import { ExecuteCommandMessage } from '../../webview-messaging';
import { ResourceIndex, ResourceIndexOptions, findCardResource, getEntry, typeIrisOf } from '../../services/editing/resource-index';
import { ResourceViewBuilder } from '../../services/editing/resource-view-builder';
import { PinnedPropertiesService } from '../../services/editing/pinned-properties-service';
import { EditorSnapshotService } from '../../services/editing/editor-snapshot-service';
import { EditOutcome, FormEditorEditHandler } from './form-editor-edit-handler';
import { FormEditorHostMessage, FormEditorWebviewMessage } from './form-editor-messages';
import { getFormReadOnlyReason } from './form-editor-read-only';
import { DocumentProblem, DocumentSnapshot, ReadOnlyReason, ResourceDetail } from './form-editor-model';
import { ScopeKey } from '@src/utilities/config-scope';
import { QuadContextCache } from './quad-context-cache';
import { reviveTerms } from '@src/utilities/rdf-terms';


/**
 * How many problems of a document a snapshot points at.
 */
const MAX_PROBLEMS = 20;

/**
 * The types of a class, whose local part the label rule writes in PascalCase.
 */
const CLASS_TYPES = new Set([OWL.Class, RDFS.Class]);

/**
 * The types of a property, whose local part the label rule writes in camelCase.
 */
const PROPERTY_TYPES = new Set([
	RDF.Property,
	OWL.ObjectProperty,
	OWL.DatatypeProperty,
	OWL.AnnotationProperty,
	OWL.OntologyProperty,
	OWL.FunctionalProperty,
	OWL.InverseFunctionalProperty,
	OWL.TransitiveProperty,
	OWL.SymmetricProperty,
	OWL.AsymmetricProperty,
	OWL.ReflexiveProperty,
	OWL.IrreflexiveProperty
]);

/**
 * How long the status bar tells how many references a rename changed, in milliseconds.
 */
const RENAME_REPORT_DURATION = 5000;

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
 * The types of the resources of the document as the store knows them, inferred ones included,
 * read at one version of it.
 */
interface InferredTypeCache {
	/**
	 * The version of the store the types were read at.
	 */
	version: number;

	/**
	 * The types of each resource asked for, by the key of its term.
	 */
	types: Map<string, readonly string[]>;
}

/**
 * The setting that holds the pinned properties, in the `mentor.formEditor` section.
 */
const PINNED_PROPERTIES_SETTING = 'pinnedProperties';

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
	 * What the published snapshot was built from: the document version, its problems, the language
	 * it is read in and the version of the store its labels and glyphs were read from. A snapshot
	 * built from the same inputs again would be the same; a change of the settings clears it.
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

	private _inferredTypes?: InferredTypeCache;

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
	 * Find the resource of the document a name stands for: a resource named by an IRI, or a blank
	 * node by its identifier, as the definition tree names them. The document decides, not the
	 * spelling of the name.
	 * @param name The IRI or the blank node identifier.
	 * @returns The resource, or `undefined` when the document describes none by that name.
	 */
	resourceNamed(name: string): NamedNode | BlankNode | undefined {
		if (!this._index) {
			return undefined;
		}

		const candidates = [RdfDataFactory.namedNode(name), RdfDataFactory.blankNode(name)];

		return candidates.find(candidate => getEntry(this._index!, candidate) !== undefined);
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

		const renames = this._labelRenamesOf(context, operations);
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

		for (const rename of renames) {
			await this.renameResource(rename.resource, rename.iri);
		}

		return outcome;
	}

	/**
	 * The renames the label rule asks for when an edit gives a label a new value: a class whose IRI
	 * was made from its label in PascalCase, or a property whose IRI was made from it in camelCase,
	 * follows the label of the same language. Read before the edit, from what the edit changes.
	 * @param context The context of the document.
	 * @param operations The operations of the edit.
	 * @returns The resources to rename, with their new IRIs.
	 */
	private _labelRenamesOf(context: TurtleDocument, operations: readonly EditOperation[]): { resource: NamedNode; iri: string }[] {
		const labelPredicates = new Set(context.predicates.label);

		return operations.flatMap(operation => {
			if (operation.op !== 'setValues' || operation.subject.termType !== 'NamedNode' || !labelPredicates.has(operation.predicate)) {
				return [];
			}

			const iri = this._labelIriOf(operation.subject, operation.predicate, operation.values);

			return iri ? [{ resource: operation.subject, iri }] : [];
		});
	}

	/**
	 * The IRI the label rule gives a resource when its label changes: the IRI is made from a label
	 * of the predicate when that label gives its local part, in the case of the kind of the
	 * resource, and then follows the new label of the same language, in the same namespace.
	 * @param resource The resource.
	 * @param predicate The IRI of the label predicate.
	 * @param values The values the edit gives the predicate.
	 * @returns The new IRI, or `undefined` when the IRI is not made from a label or stays.
	 */
	private _labelIriOf(resource: NamedNode, predicate: string, values: readonly StatementValue[]): string | undefined {
		const summary = this._snapshot?.resources.find(candidate => candidate.term.equals(resource));
		const entry = this._index ? getEntry(this._index, resource) : undefined;
		const letterCase = entry ? _localPartCaseOf(typeIrisOf(entry)) : undefined;
		const localPart = summary?.localPart;

		if (!entry || !localPart || !letterCase) {
			return undefined;
		}

		const source = entry.quads.find(quad => quad.predicate.value === predicate && quad.object.termType === 'Literal' && getLocalPartFromLabel(quad.object.value, letterCase) === localPart)?.object;
		const label = values.find(value => value.kind === 'term' && value.term.termType === 'Literal' && source?.termType === 'Literal' && value.term.language === source.language);
		const renamed = label?.kind === 'term' ? getLocalPartFromLabel(label.term.value, letterCase) : undefined;

		if (!renamed || renamed === localPart || !isPlainLocalName(renamed)) {
			return undefined;
		}

		return resource.value.slice(0, resource.value.length - localPart.length) + renamed;
	}

	/**
	 * Rename a resource as F2 does, with Mentor's rename provider: its IRI gets another local part
	 * wherever the workspace writes it, as one edit that one undo takes back. The namespace of the
	 * IRI stays, as the provider renames by the local part. The status bar tells how many
	 * references changed, and the webview the IRI the resource has now.
	 * @param resource The resource.
	 * @param iri The new IRI.
	 */
	async renameResource(resource: NamedNode, iri: string): Promise<void> {
		await this._waitUntilLoaded();

		const context = this._getTokenizedContext();
		const summary = this._snapshot?.resources.find(candidate => candidate.term.equals(resource));

		if (!context || !summary?.localPart || iri === resource.value) {
			return;
		}

		const namespace = resource.value.slice(0, resource.value.length - summary.localPart.length);

		if (!iri.startsWith(namespace)) {
			void vscode.window.showErrorMessage(`${resource.value} cannot be renamed to ${iri}: only the local part after ${namespace} can change.`);

			return;
		}

		const localPart = iri.slice(namespace.length);

		if (!isPlainLocalName(localPart)) {
			void vscode.window.showErrorMessage(`'${localPart}' cannot be the local part of an IRI: it starts with a letter or '_' and holds letters, digits, '_', '-' and '.'.`);

			return;
		}

		const position = tokensMatchText(context.tokens, this._document.getText()) ? _renamePositionOf(context, resource.value, summary.prefixedName !== undefined) : undefined;
		const edit = position ? await this._renameEditAt(position, localPart) : undefined;

		if (!edit || edit.size === 0 || !(await vscode.workspace.applyEdit(edit))) {
			void vscode.window.showErrorMessage(`${summary.prefixedName ?? resource.value} could not be renamed.`);

			return;
		}

		vscode.window.setStatusBarMessage(_renameReport(edit), RENAME_REPORT_DURATION);
		this._postMessage({ id: 'ResourceRenamed', resource, renamed: RdfDataFactory.namedNode(iri) });
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

		this._subscriptions.push(settings.onDidChange('view.activeLanguage', () => void this._refreshWhenLoaded()));
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
			case 'PickLanguage':
				await this._pickLanguage(message.allLanguages);
				break;
			case 'CopyAsTurtle':
				await this._copyAsTurtle(message.anchor, message.version);
				break;
			case 'RenameResource':
				await this.renameResource(message.resource, message.iri);
				break;
			case 'SetPin':
				await this.setPin(message.resource, message.predicate, message.scope);
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
	 * Let the user choose the language the document is read in, with Mentor's language selection,
	 * or the values of every language, and tell the webview which. The snapshot is built again when
	 * a language was chosen, which the setting announcing it does not tell when another document
	 * chose the same language before.
	 * @param allLanguages Whether the values of every language are shown now.
	 */
	private async _pickLanguage(allLanguages: boolean): Promise<void> {
		const options: SelectActiveLanguageOptions = { offerAllLanguages: true, allLanguagesShown: allLanguages };
		const selection = await vscode.commands.executeCommand<LanguageSelection | undefined>(selectActiveLanguage.id, options);

		if (!selection) {
			return;
		}

		this._postMessage({ id: 'LanguagePicked', allLanguages: selection.kind === 'allLanguages' });

		if (selection.kind === 'language') {
			void this._refreshWhenLoaded();
		}
	}

	/**
	 * Put the text of a blank node written in place on the clipboard, as Copy as Turtle does. The
	 * anchor is an offset into the version the webview read it from; once the document changed, the
	 * node may be written elsewhere, and nothing is copied.
	 * @param anchor The offset the node starts at.
	 * @param version The document version the offset belongs to.
	 */
	private async _copyAsTurtle(anchor: number, version: number): Promise<void> {
		const context = this._getTokenizedContext();
		const text = this._document.getText();

		if (!context || version !== this._document.version || !tokensMatchText(context.tokens, text)) {
			return;
		}

		const span = getBlankNodeSpan(context.tokens, anchor);

		if (span) {
			await vscode.env.clipboard.writeText(text.slice(span.start, span.end));
		}
	}

	/**
	 * Rebuild the snapshot even from the same inputs, as a change of the settings changes how the
	 * same document is shown.
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
			await this._waitUntilLoaded();
		} finally {
			this._refreshPending = false;
		}

		this._publishSnapshot();
	}

	/**
	 * Wait until the document is loaded, the parse delivered last included.
	 */
	private async _waitUntilLoaded(): Promise<void> {
		while (this._contextService.isLoading(this._documentUri)) {
			await this._contextService.waitUntilLoaded(this._documentUri);
		}
	}


	/**
	 * Ask Mentor's rename provider for the edit that renames the IRI written at a position.
	 * @param position The position of a written reference of the IRI.
	 * @param localPart The new local part.
	 * @returns The edit, or `undefined` when the provider cannot rename there.
	 */
	private async _renameEditAt(position: vscode.Position, localPart: string): Promise<vscode.WorkspaceEdit | undefined> {
		try {
			return await vscode.commands.executeCommand<vscode.WorkspaceEdit>('vscode.executeDocumentRenameProvider', this._document.uri, position, localPart);
		} catch {
			return undefined;
		}
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
		const key = `${this._document.version}|${this._getVocabulary()?.store.version ?? ''}|${context.activeLanguageTag ?? ''}|${readOnly ?? ''}|${JSON.stringify(problems)}`;

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
		const result = new EditorSnapshotService({
			version: this._document.version,
			revision: ++this._revision,
			uri: this._documentUri,
			quadContexts: readOnly === 'template' ? [] : this._quadContexts.get(context),
			context,
			readOnly,
			problems,
			countUsages: iri => this._countUsages(iri),
			pins: _readPins(),
			inferredTypesOf: resource => this._inferredTypesOf(context.graphs, resource),
			pinScopes: _pinScopes()
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
	 * Pin a property of a resource for its types, for oneself in the user settings or for everyone
	 * in the workspace settings, or unpin it. The pin is stored under the pin type of the resource,
	 * its primary asserted type or else its first inferred one; unpinning takes it from every type
	 * of the resource. The changed setting rebuilds the snapshot.
	 * @param resource The resource.
	 * @param predicate The predicate.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	async setPin(resource: NamedNode | BlankNode, predicate: NamedNode, scope: ScopeKey | undefined): Promise<void> {
		const entry = this._index ? getEntry(this._index, resource) : undefined;
		const context = this._getTokenizedContext();

		if (!entry || !context || (scope && !_pinScopes().includes(scope))) {
			return;
		}

		const asserted = typeIrisOf(entry);
		const inferred = this._inferredTypesOf(context.graphs, resource);
		const pinType = PinnedPropertiesService.pinTypeOf(asserted, inferred);

		if (!pinType) {
			return;
		}

		const change = _readPins().withPin(Array.from(new Set([...asserted, ...inferred])), pinType, predicate.value, scope);
		const configuration = getConfig('formEditor');

		if (change.workspace) {
			await configuration.update(PINNED_PROPERTIES_SETTING, change.workspace, toConfigurationTarget('workspace'));
		}

		if (change.user) {
			await configuration.update(PINNED_PROPERTIES_SETTING, change.user, toConfigurationTarget('user'));
		}
	}

	/**
	 * The types of a resource the store knows, inferred ones included, which an untyped blank node
	 * of a shape gets from the reasoner. Memoized until the store changes.
	 * @param graphs The graphs of the document.
	 * @param resource The resource.
	 * @returns The type IRIs, none when there is no store.
	 */
	private _inferredTypesOf(graphs: string[], resource: NamedNode | BlankNode): readonly string[] {
		const store = this._getVocabulary()?.store;

		if (!store) {
			return [];
		}

		if (!this._inferredTypes || this._inferredTypes.version !== store.version) {
			this._inferredTypes = { version: store.version, types: new Map() };
		}

		const key = termToString(resource);
		const known = this._inferredTypes.types.get(key);

		if (known) {
			return known;
		}

		const types = new Set<string>();

		// Read with the inference graphs when the store has a reasoner; asking for them without one
		// throws.
		for (const quad of store.matchAll(graphs, resource, rdf.type, null, store.reasoner ? true : false)) {
			if (quad.object.termType === 'NamedNode') {
				types.add(quad.object.value);
			}
		}

		const result = Array.from(types);

		this._inferredTypes.types.set(key, result);

		return result;
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
			labelPredicates: [],
			descriptionPredicates: [],
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

/**
 * Find where the local part of an IRI is written in a document, so that Mentor's rename provider
 * renames the IRI there rather than its prefix: in a prefixed name where the resource has one,
 * else in an IRI reference, on the last character of the local part.
 * @param context The context of the document.
 * @param iri The IRI.
 * @param prefixed Whether the resource has a prefixed name.
 * @returns The position, or `undefined` when the document writes the IRI nowhere.
 */
function _renamePositionOf(context: TurtleDocument, iri: string, prefixed: boolean): vscode.Position | undefined {
	const wanted = prefixed ? RdfToken.PNAME_LN.name : RdfToken.IRIREF.name;
	const references = context.references.getRanges(iri).flatMap(range => {
		const token = getTokenAtPosition(context.tokens, range.start);

		return token ? [{ range, token }] : [];
	});
	const reference = references.find(candidate => candidate.token.tokenType.name === wanted) ?? references[0];

	if (!reference) {
		return undefined;
	}

	// The last character of the local part: before the closing bracket of an IRI reference.
	const image = reference.token.image;
	const offset = reference.token.tokenType.name === RdfToken.IRIREF.name ? image.length - 2 : image.length - 1;

	return new vscode.Position(reference.range.start.line, reference.range.start.character + offset);
}

/**
 * Tell how many references a rename changed, in how many files.
 * @param edit The edit of the rename.
 * @returns The report.
 */
function _renameReport(edit: vscode.WorkspaceEdit): string {
	const entries = edit.entries();
	const references = entries.reduce((count, [, edits]) => count + edits.length, 0);
	const files = entries.length;

	return `Renamed: ${references} ${references === 1 ? 'reference' : 'references'} updated${files > 1 ? ` in ${files} files` : ''}.`;
}

/**
 * The case the label rule writes the local part of a resource in: PascalCase for a class,
 * camelCase for a property, by its types.
 * @param types The IRIs of the types of the resource.
 * @returns The case, or `undefined` for a resource the rule leaves alone.
 */
function _localPartCaseOf(types: readonly string[]): LocalPartCase | undefined {
	if (types.some(type => CLASS_TYPES.has(type))) {
		return 'pascal';
	}

	return types.some(type => PROPERTY_TYPES.has(type)) ? 'camel' : undefined;
}

/**
 * Read the pinned properties from the two layers of the setting: the workspace one for everyone,
 * the user one for oneself.
 * @returns The pins.
 */
function _readPins(): PinnedPropertiesService {
	const layers = getConfig('formEditor').inspect<unknown>(PINNED_PROPERTIES_SETTING);

	return PinnedPropertiesService.fromLayers(layers?.workspaceValue, layers?.globalValue);
}

/**
 * The settings a property can be pinned in: the user settings, and the workspace settings, which
 * the pins for everyone are stored in, while a workspace folder is open.
 * @returns The scopes.
 */
function _pinScopes(): ScopeKey[] {
	return (vscode.workspace.workspaceFolders?.length ?? 0) > 0 ? ['user', 'workspace'] : ['user'];
}
