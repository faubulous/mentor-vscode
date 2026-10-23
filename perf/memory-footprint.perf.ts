import { describe, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@src/languages/sparql/services/sparql-connection-registry', () => ({
	WORKSPACE_CONNECTION: { id: 'workspace' },
}));

const harnessState = vi.hoisted(() => ({ history: [] as unknown[] }));

// The webview controller resolves its collaborators from the tsyringe container.
// One stub serves every token: it answers the events and lookups the constructor
// and the history post need, and ignores everything else.
vi.mock('tsyringe', () => {
	const subscribe = () => ({ dispose: () => { } });
	const stub: Record<string, unknown> = {
		subscriptions: [],
		onDidHistoryChange: subscribe,
		onDidChangeConnections: subscribe,
		onDidGraphLoadStart: subscribe,
		onDidGraphLoadEnd: subscribe,
		onDidChangeGraphs: subscribe,
		getQueryHistory: () => harnessState.history,
		getConnections: () => [],
		getWorkspaceGraphs: () => [],
		getGraphsForConnection: () => [],
		hasGraphsForConnection: () => false,
		getGraphLoadError: () => undefined,
	};

	return {
		container: { resolve: () => stub, registerInstance: () => { } },
		injectable: () => (target: unknown) => target,
		inject: () => () => { },
		singleton: () => (target: unknown) => target,
	};
});

import * as vscode from 'vscode';
import { OwlReasoner, Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from '@src/services/document/document-factory';
import { DocumentTokenSource } from '@src/services/document/document-token-source';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';
import { IDocumentContext, isTokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { SparqlResultsController } from '@src/views/webviews/views/sparql-results/sparql-results-controller';
import { createTestSettings } from '@src/utilities/mocks/factories';
import { CorpusGenerator } from './corpus-generator';

/**
 * One measured phase of the harness.
 */
interface PhaseResult {
	phase: string;
	files: number;
	quads: number;
	ms: number;
	/** Heap growth still present after a forced garbage collection. */
	retainedMb: number;
	/** Heap growth right after the phase, before the collection: allocation churn. */
	unCollectedMb: number;
	perFileKb: number;
}

/**
 * A file of the corpus: its URI and Turtle text.
 */
interface CorpusFile {
	uri: vscode.Uri;
	text: string;
}

const BYTES_PER_MEGABYTE = 1024 * 1024;
const SMALL_FILE_COUNT = readIntegerSetting('PERF_FILES', 100);
const SMALL_FILE_CLASSES = readIntegerSetting('PERF_CLASSES', 500);
const LARGE_FILE_CLASSES = readIntegerSetting('PERF_LARGE_CLASSES', 50000);
const HISTORY_ENTRIES = readIntegerSetting('PERF_HISTORY_ENTRIES', 10);
const HISTORY_ROWS = readIntegerSetting('PERF_HISTORY_ROWS', 100000);
const HISTORY_RAW_CHARS = readIntegerSetting('PERF_HISTORY_RAW_CHARS', 5000000);
const QUADS_PER_CLASS = 4;

const results: PhaseResult[] = [];

function readIntegerSetting(name: string, fallback: number): number {
	const value = Number.parseInt(process.env[name] ?? '', 10);

	return Number.isFinite(value) ? value : fallback;
}

function forceGarbageCollection(): void {
	if (typeof global.gc !== 'function') {
		throw new Error('The harness needs --expose-gc; run it with `npm run perf`.');
	}

	global.gc();
}

function heapUsedMb(): number {
	return process.memoryUsage().heapUsed / BYTES_PER_MEGABYTE;
}

/**
 * Runs one phase between two forced collections and records its cost.
 */
async function measure(phase: string, files: number, quads: number, run: () => Promise<void> | void): Promise<PhaseResult> {
	forceGarbageCollection();

	const heapBefore = heapUsedMb();
	const start = performance.now();

	await run();

	const ms = performance.now() - start;
	const unCollectedMb = heapUsedMb() - heapBefore;

	forceGarbageCollection();

	const retainedMb = heapUsedMb() - heapBefore;
	const result = { phase, files, quads, ms, retainedMb, unCollectedMb, perFileKb: files > 0 ? retainedMb * 1024 / files : 0 };

	results.push(result);

	return result;
}

/**
 * Builds the corpus: either every Turtle file below `PERF_CORPUS`, or a
 * generated workspace of many small files plus one large file.
 */
function loadCorpus(): CorpusFile[] {
	const corpusDirectory = process.env.PERF_CORPUS;

	if (corpusDirectory) {
		return fs.readdirSync(corpusDirectory)
			.filter(name => name.endsWith('.ttl'))
			.sort()
			.map(name => ({
				uri: vscode.Uri.parse(`file:///perf/${name}`),
				text: fs.readFileSync(path.join(corpusDirectory, name), 'utf8')
			}));
	}

	const generator = new CorpusGenerator(42);
	const files: CorpusFile[] = [];

	for (const [uri, text] of generator.generateWorkspace(SMALL_FILE_COUNT, SMALL_FILE_CLASSES)) {
		files.push({ uri: vscode.Uri.parse(uri), text });
	}

	files.push({
		uri: vscode.Uri.parse('file:///perf/large.ttl'),
		text: generator.generateOntologyTurtle(LARGE_FILE_CLASSES, 'http://example.org/perf/large/')
	});

	return files;
}

function countQuads(files: CorpusFile[]): number {
	return files.reduce((sum, file) => sum + (file.text.match(/ a owl:Class ;/g)?.length ?? 0) * QUADS_PER_CLASS, 0);
}

/**
 * The production object graph of the indexing pipeline, built the same way
 * the service container builds it.
 */
function createPipeline() {
	const store = new Store(new OwlReasoner());
	const vocabulary = new VocabularyRepository(store);
	const factory = new DocumentFactory(store, vocabulary, createTestSettings());
	const extensionContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;

	let contextService: DocumentContextService;

	const tokenSource = new DocumentTokenSource(key => contextService.contexts[key]);

	contextService = new DocumentContextService(extensionContext, store, vocabulary, factory, tokenSource);

	const diagnostics = new DocumentDiagnosticsService(tokenSource, key => contextService.contexts[key]);

	return { store, factory, contextService, diagnostics };
}

/**
 * Releases the parse result of a context if the context supports it; the
 * baseline before the fix has no such method, so the phase then measures zero.
 */
function releaseParseResult(context: IDocumentContext): void {
	const releasable = context as IDocumentContext & { releaseParseResult?: () => void };

	if (typeof releasable.releaseParseResult === 'function') {
		releasable.releaseParseResult();
	}
}

function printResults(): void {
	const header = ['phase', 'files', 'quads', 'ms', 'retainedMb', 'unCollectedMb', 'perFileKb'];
	const rows = results.map(result => [
		result.phase,
		String(result.files),
		String(result.quads),
		result.ms.toFixed(0),
		result.retainedMb.toFixed(1),
		result.unCollectedMb.toFixed(1),
		result.perFileKb.toFixed(0)
	]);
	const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column].length)));
	const formatRow = (row: string[]) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ');

	process.stdout.write('\n' + formatRow(header) + '\n');

	for (const row of rows) {
		process.stdout.write(formatRow(row) + '\n');
	}

	for (const result of results) {
		process.stdout.write('PERF ' + JSON.stringify(result) + '\n');
	}
}

describe('memory footprint', () => {
	const corpus = loadCorpus();
	const quads = countQuads(corpus);
	const largeFile = corpus[corpus.length - 1];

	it('indexes the corpus end to end through the document context service', async () => {
		const { contextService, diagnostics } = createPipeline();

		await measure('index: load + diagnose', corpus.length, quads, async () => {
			for (const file of corpus) {
				await contextService.loadDocumentContent(file.uri, file.text);

				diagnostics.diagnoseContent(file.uri, file.text);
			}
		});

		await measure('index: release parse results', corpus.length, quads, () => {
			for (const context of Object.values(contextService.contexts)) {
				releaseParseResult(context);
			}
		});
	});

	it('measures the pipeline phase by phase', async () => {
		const { store, factory, diagnostics, contextService } = createPipeline();
		const contexts = corpus.map(file => {
			const context = factory.create(file.uri);

			contextService.contexts[file.uri.toString()] = context;

			return context;
		});

		await measure('phase: parse', corpus.length, quads, () => {
			contexts.forEach((context, index) => context.parse(corpus[index].text));
		});

		await measure('phase: loadTriples', corpus.length, quads, async () => {
			for (const [index, context] of contexts.entries()) {
				await context.loadTriples(corpus[index].text);
			}
		});

		await measure('phase: diagnoseContent', corpus.length, quads, () => {
			corpus.forEach(file => diagnostics.diagnoseContent(file.uri, file.text));
		});

		await measure('phase: releaseParseResult', corpus.length, quads, () => {
			contexts.forEach(context => releaseParseResult(context));
		});

		await measure('phase: infer', corpus.length, quads, async () => {
			for (const context of contexts) {
				await context.infer();
			}
		});

		const largeContext = contexts[contexts.length - 1];
		const largeGraph = largeContext.graphs[0];
		const largeQuads = (largeFile.text.match(/ a owl:Class ;/g)?.length ?? 0) * QUADS_PER_CLASS;

		await measure('store: hasGraph x100 (large graph)', 1, largeQuads, () => {
			for (let index = 0; index < 100; index++) {
				store.hasGraph(largeGraph);
			}
		});

		await measure('store: getGraphs x10', corpus.length, quads, () => {
			for (let index = 0; index < 10; index++) {
				store.getGraphs();
			}
		});

		await measure('store: executeInference (large graph)', 1, largeQuads, () => {
			store.executeInference(largeGraph);
		});

		await measure('store: reload large file (loadTriples again)', 1, largeQuads, async () => {
			if (isTokenizedDocumentContext(largeContext)) {
				largeContext.parse(largeFile.text);
			}

			await largeContext.loadTriples(largeFile.text);
		});
	});

	it('measures the SPARQL history post to the results webview', async () => {
		const generator = new CorpusGenerator(7);

		await measure('history: build entries', HISTORY_ENTRIES, HISTORY_ENTRIES * HISTORY_ROWS, () => {
			harnessState.history = Array.from({ length: HISTORY_ENTRIES }, (_, index) => generator.generateQueryHistoryEntry(HISTORY_ROWS, HISTORY_RAW_CHARS, index));
		});

		(vscode.window as any).registerWebviewViewProvider ??= () => ({ dispose: () => { } });

		const controller = new SparqlResultsController();

		let payloadBytes = 0;

		(controller as any).postMessage = (message: unknown) => {
			payloadBytes = JSON.stringify(message).length;
		};

		const post = await measure('history: post to webview (serialize)', HISTORY_ENTRIES, HISTORY_ENTRIES * HISTORY_ROWS, () => {
			(controller as any)._postQueryHistory();
		});

		process.stdout.write(`PERF ${JSON.stringify({ phase: 'history: payload bytes', bytes: payloadBytes, ms: post.ms })}\n`);

		harnessState.history = [];
		printResults();
	});
});
