import * as vscode from 'vscode';
import { Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ISettingsService } from '@src/services/core/settings-service.interface';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { SparqlDocument } from '@src/languages/sparql/sparql-document';
import { XmlDocument } from '@src/languages/xml/xml-document';

/**
 * Typed factories for constructing domain objects and vscode API stubs in tests.
 *
 * This module is type-checked against the real `@types/vscode` API, while the
 * vitest alias substitutes `@src/utilities/mocks/vscode` at runtime — the same
 * dual nature as the vscode mock itself. Tests should construct collaborators
 * through these factories instead of padding constructors with `undefined as any`.
 */

/**
 * Create a real, empty RDF store — the same construction production uses.
 */
export function createTestStore(): Store {
	return new Store();
}

/**
 * Create a real vocabulary repository over the given (or a fresh) store.
 */
export function createTestVocabulary(store?: Store): VocabularyRepository {
	return new VocabularyRepository(store ?? createTestStore());
}

/**
 * A fully-typed in-memory settings service with a test hook for firing change events.
 */
export interface TestSettingsService extends ISettingsService {
	/**
	 * Fire the change listeners registered for a key.
	 */
	fireChange(key: string, oldValue: unknown, newValue: unknown): void;
}

/**
 * Create an in-memory {@link ISettingsService}: `get` falls back to the provided
 * default, `set` stores the value and notifies listeners registered via `onDidChange`.
 */
export function createTestSettings(initial: Record<string, unknown> = {}): TestSettingsService {
	const values = new Map<string, unknown>(Object.entries(initial));
	const listeners = new Map<string, Array<(e: { key: string; oldValue: any; newValue: any }) => void>>();

	const fireChange = (key: string, oldValue: unknown, newValue: unknown) => {
		for (const listener of listeners.get(key) ?? []) {
			listener({ key, oldValue, newValue });
		}
	};

	return {
		onDidChange(key, callback) {
			const callbacks = listeners.get(key) ?? [];
			callbacks.push(callback);
			listeners.set(key, callbacks);

			return new vscode.Disposable(() => {
				listeners.set(key, (listeners.get(key) ?? []).filter(c => c !== callback));
			});
		},
		get<T>(key: string, defaultValue?: T): T | undefined {
			return values.has(key) ? values.get(key) as T : defaultValue;
		},
		set<T>(key: string, value: T): void {
			const oldValue = values.get(key);
			values.set(key, value);
			fireChange(key, oldValue, value);
		},
		has(key: string): boolean {
			return values.get(key) !== undefined;
		},
		fireChange,
	};
}

/**
 * Optional collaborators for document factories. Omitted values default to a
 * real store, a real vocabulary repository over that store, and an in-memory
 * settings service.
 */
export interface TestDocumentOptions {
	store?: Store;
	vocabulary?: VocabularyRepository;
	settings?: ISettingsService;
}

function resolveDocumentOptions(options?: TestDocumentOptions): { store: Store; vocabulary: VocabularyRepository; settings: ISettingsService } {
	const store = options?.store ?? createTestStore();

	return {
		store,
		vocabulary: options?.vocabulary ?? createTestVocabulary(store),
		settings: options?.settings ?? createTestSettings(),
	};
}

function toUri(uri: string | vscode.Uri): vscode.Uri {
	return typeof uri === 'string' ? vscode.Uri.parse(uri) : uri;
}

/**
 * Create a {@link TurtleDocument} with real default collaborators — the same
 * wiring `DocumentFactory.create` performs in production.
 */
export function createTurtleDocument(uri: string | vscode.Uri = 'file:///test.ttl', syntax: RdfSyntax = RdfSyntax.Turtle, options?: TestDocumentOptions): TurtleDocument {
	const { store, vocabulary, settings } = resolveDocumentOptions(options);

	return new TurtleDocument(toUri(uri), syntax, store, vocabulary, settings);
}

/**
 * Create a {@link SparqlDocument} with real default collaborators.
 */
export function createSparqlDocument(uri: string | vscode.Uri = 'file:///test.sparql', options?: TestDocumentOptions): SparqlDocument {
	const { store, vocabulary, settings } = resolveDocumentOptions(options);

	return new SparqlDocument(toUri(uri), store, vocabulary, settings);
}

/**
 * Create an {@link XmlDocument} with real default collaborators.
 */
export function createXmlDocument(uri: string | vscode.Uri = 'file:///test.rdf', options?: TestDocumentOptions): XmlDocument {
	const { store, vocabulary, settings } = resolveDocumentOptions(options);

	return new XmlDocument(toUri(uri), store, vocabulary, settings);
}

/**
 * Create a typed no-op {@link IDocumentContextService} stub. Pass overrides for
 * the members a test needs to control.
 */
export function createMockDocumentContextService(overrides?: Partial<IDocumentContextService>): IDocumentContextService {
	return {
		contexts: {},
		activeContext: undefined,
		onDidChangeDocumentContext: new vscode.EventEmitter<any>().event,
		dispose: () => { },
		getDocumentContextFromUri: () => undefined,
		getDocumentContext: () => null,
		getContextFromUri: () => undefined,
		getContext: () => null,
		loadDocument: async () => undefined,
		activateDocument: async () => undefined,
		handleActiveEditorChanged: async () => { },
		handleActiveNotebookEditorChanged: async () => { },
		handleTextDocumentChanged: async () => { },
		handleDocumentClosed: () => { },
		...overrides,
	};
}

/**
 * Create a typed no-op {@link IDocumentContext} stub. Pass overrides for the
 * members a test needs to control.
 */
export function createMockDocumentContext(overrides?: Partial<IDocumentContext>): IDocumentContext {
	const uri = vscode.Uri.parse('file:///test.ttl');

	return {
		uri,
		graphs: [],
		graphIri: uri,
		baseIri: undefined,
		namespaces: {},
		namespaceDefinitions: {},
		subjects: {},
		references: {},
		slug: undefined,
		providesTokens: true,
		typeAssertions: {},
		typeDefinitions: {},
		predicateStats: {},
		primaryLanguage: undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
		predicates: { label: [], description: [] },
		isParsed: false,
		isLoaded: false,
		isTemporary: false,
		parse: () => [],
		loadTriples: async () => { },
		infer: async () => { },
		getIriAtPosition: () => undefined,
		getLiteralAtPosition: () => undefined,
		onDidChangeDocument: async () => { },
		getTextDocument: () => undefined,
		getPrefixForNamespaceIri: () => undefined,
		updateNamespacePrefix: () => { },
		getResourceLabel: subjectUri => ({ value: subjectUri, language: undefined }),
		getPropertyPathLabel: () => '',
		getResourceDescription: () => undefined,
		getResourceIri: subjectIri => subjectIri,
		getResourceTooltip: () => new vscode.MarkdownString(),
		...overrides,
	};
}

/**
 * Create a fully-typed {@link vscode.TextDocument} over an in-memory string.
 */
export function createMockTextDocument(content = '', options?: { uri?: string | vscode.Uri; languageId?: string; version?: number }): vscode.TextDocument {
	const uri = toUri(options?.uri ?? 'file:///test.ttl');
	const languageId = options?.languageId ?? 'turtle';
	const version = options?.version ?? 1;
	const lines = content.split('\n');

	const lineOffsets: number[] = [];
	let offset = 0;

	for (const line of lines) {
		lineOffsets.push(offset);
		offset += line.length + 1;
	}

	const positionAt = (targetOffset: number): vscode.Position => {
		const clamped = Math.max(0, Math.min(targetOffset, content.length));
		let line = lineOffsets.findIndex((start, i) => clamped >= start && (i + 1 >= lineOffsets.length || clamped < lineOffsets[i + 1]));

		if (line < 0) {
			line = lines.length - 1;
		}

		return new vscode.Position(line, clamped - lineOffsets[line]);
	};

	const offsetAt = (position: vscode.Position): number => {
		const line = Math.max(0, Math.min(position.line, lines.length - 1));

		return lineOffsets[line] + Math.max(0, Math.min(position.character, lines[line].length));
	};

	const lineAt = (lineOrPosition: number | vscode.Position): vscode.TextLine => {
		const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
		const text = lines[line] ?? '';
		const range = new vscode.Range(line, 0, line, text.length);

		return {
			lineNumber: line,
			text,
			range,
			rangeIncludingLineBreak: line < lines.length - 1 ? new vscode.Range(line, 0, line + 1, 0) : range,
			firstNonWhitespaceCharacterIndex: Math.max(0, text.search(/\S/)),
			isEmptyOrWhitespace: text.trim().length === 0,
		};
	};

	return {
		uri,
		fileName: uri.fsPath,
		isUntitled: false,
		languageId,
		version,
		isDirty: false,
		isClosed: false,
		encoding: 'utf8',
		save: async () => true,
		eol: vscode.EndOfLine.LF,
		lineCount: lines.length,
		lineAt,
		offsetAt,
		positionAt,
		getText: (range?: vscode.Range) => {
			if (!range) {
				return content;
			}

			return content.substring(offsetAt(range.start), offsetAt(range.end));
		},
		getWordRangeAtPosition: () => undefined,
		validateRange: range => range,
		validatePosition: position => position,
	};
}

/**
 * Create a fully-typed {@link vscode.TextEditor} stub around a text document.
 */
export function createMockTextEditor(document?: vscode.TextDocument): vscode.TextEditor {
	return {
		document: document ?? createMockTextDocument(),
		selection: new vscode.Selection(0, 0, 0, 0),
		selections: [new vscode.Selection(0, 0, 0, 0)],
		visibleRanges: [],
		options: {},
		viewColumn: undefined,
		edit: async () => true,
		insertSnippet: async () => true,
		setDecorations: () => { },
		revealRange: () => { },
		show: () => { },
		hide: () => { },
	};
}

/**
 * A single text edit flattened out of a {@link vscode.WorkspaceEdit}, for assertions.
 */
export interface FlatTextEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newText: string;
}

/**
 * Flatten a workspace edit's `entries()` tuples into a single list of edits, in
 * insertion order per resource.
 */
export function getTextEdits(edit: vscode.WorkspaceEdit): FlatTextEdit[] {
	return edit.entries().flatMap(([uri, edits]) => edits.map(e => ({ uri, range: e.range, newText: e.newText })));
}

/**
 * Whether a flattened edit is an insertion (empty range, non-empty text).
 */
export function isInsertEdit(edit: FlatTextEdit): boolean {
	return edit.range.start.isEqual(edit.range.end) && edit.newText !== '';
}

/**
 * Whether a flattened edit is a deletion (empty replacement text).
 */
export function isDeleteEdit(edit: FlatTextEdit): boolean {
	return edit.newText === '';
}

/**
 * Whether a flattened edit is a replacement (non-empty range and text).
 */
export function isReplaceEdit(edit: FlatTextEdit): boolean {
	return !isInsertEdit(edit) && !isDeleteEdit(edit);
}

/**
 * Specification of a notebook cell for {@link createMockNotebook}.
 */
export interface MockNotebookCellSpec {
	/**
	 * The cell language, e.g. 'sparql' or 'turtle'.
	 */
	languageId: string;

	/**
	 * The cell source text.
	 */
	content?: string;

	/**
	 * The initial cell metadata.
	 */
	metadata?: { [key: string]: any };
}

/**
 * Creates a mock notebook document whose cells carry live `metadata` objects
 * and `index` properties. When registered in `vscode.workspace.notebookDocuments`,
 * the mock `workspace.applyEdit` applies `NotebookEdit.updateCellMetadata`
 * descriptors to these cells and fires `onDidChangeNotebookDocument`, so
 * "set metadata → read metadata" round-trips can be asserted in tests.
 * @param cells The cell specifications.
 * @param options Optional notebook URI (defaults to `file:///w/test.mnb`).
 */
export function createMockNotebook(
	cells: MockNotebookCellSpec[],
	options?: { uri?: vscode.Uri }
): vscode.NotebookDocument {
	const uri = options?.uri ?? vscode.Uri.parse('file:///w/test.mnb');

	const notebookCells: any[] = cells.map((spec, index) => ({
		index,
		kind: 2, // NotebookCellKind.Code
		notebook: undefined as any,
		document: createMockTextDocument(spec.content ?? '', {
			uri: uri.with({ scheme: 'vscode-notebook-cell', fragment: `cell${index}` }),
			languageId: spec.languageId,
		}),
		metadata: spec.metadata ?? {},
		outputs: [],
		executionSummary: undefined,
	}));

	const notebook: any = {
		uri,
		notebookType: 'mentor-notebook',
		isDirty: false,
		isUntitled: false,
		isClosed: false,
		metadata: {},
		version: 1,
		get cellCount() { return notebookCells.length; },
		getCells: () => notebookCells,
		cellAt: (index: number) => notebookCells[index],
		save: async () => true,
	};

	for (const cell of notebookCells) {
		cell.notebook = notebook;
	}

	return notebook as vscode.NotebookDocument;
}

/**
 * A status bar item as captured by {@link createStatusBarRecorder}: reads and
 * writes of `text` work as usual, and every write is appended to `texts`.
 */
export interface RecordedStatusBarItem {
	alignment: number | undefined;
	priority: number | undefined;

	/**
	 * Every value assigned to `text`, in order — for asserting progress
	 * sequences and write-throttling.
	 */
	texts: string[];

	text: string;
	tooltip: string;
	command: unknown;
	shownCount: number;
	show(): void;
	hide(): void;
	dispose(): void;
}

/**
 * The recorder returned by {@link createStatusBarRecorder}.
 */
export interface StatusBarRecorder {
	/**
	 * All created items in creation order.
	 */
	items: RecordedStatusBarItem[];

	/**
	 * The most recently created item with the given priority — the reliable way
	 * to tell the extension's status bar items apart (indexer −10001,
	 * validation −10002, SPARQL summary).
	 */
	byPriority(priority: number): RecordedStatusBarItem | undefined;
}

/**
 * Replaces the mock `window.createStatusBarItem` with a recorder that captures
 * every created item and the sequence of its `text` writes. Install before the
 * service under test is constructed.
 */
export function createStatusBarRecorder(): StatusBarRecorder {
	const items: RecordedStatusBarItem[] = [];

	(vscode.window as any).createStatusBarItem = (alignment?: number, priority?: number) => {
		let value = '';

		const item: RecordedStatusBarItem = {
			alignment,
			priority,
			texts: [],
			get text() { return value; },
			set text(newValue: string) {
				value = newValue;
				this.texts.push(newValue);
			},
			tooltip: '',
			command: undefined,
			shownCount: 0,
			show() { this.shownCount++; },
			hide() { },
			dispose() { },
		};

		items.push(item);

		return item;
	};

	return {
		items,
		byPriority: (priority: number) => [...items].reverse().find(item => item.priority === priority),
	};
}
