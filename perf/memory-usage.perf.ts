import { describe, it, vi } from 'vitest';

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
import { Store } from '@faubulous/mentor-rdf';
import { TurtleLexer, TurtleParser, TurtleQuadReader, TurtleReader, createFileBlankNodeIdGenerator } from '@faubulous/mentor-rdf-parsers';
import { isTokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { SparqlResultsController } from '@src/views/webviews/views/sparql-results/sparql-results-controller';
import { CorpusGenerator } from './corpus-generator';
import { MemoryUsageObserver } from './memory-usage-observer';
import { MemoryUsageTester } from './memory-usage-tester';

describe('MemoryUsage', () => {
	const tester = new MemoryUsageTester();
	const observer = new MemoryUsageObserver();
	const corpus = tester.loadCorpus();
	const quads = tester.countQuads(corpus);
	const largeFile = corpus[corpus.length - 1];

	it('indexes the corpus end to end through the document context service', async () => {
		const { contextService, diagnostics } = tester.createPipeline();

		await observer.measure('index: load + diagnose', corpus.length, quads, async () => {
			for (const file of corpus) {
				await contextService.loadDocumentContent(file.uri, file.text);

				diagnostics.diagnoseContent(file.uri, file.text);
			}
		});

		await observer.measure('index: release parse results', corpus.length, quads, () => {
			for (const context of Object.values(contextService.contexts)) {
				tester.releaseParseResult(context);
			}
		});
	});

	it('measures the pipeline phase by phase', async () => {
		const { store, factory, diagnostics, contextService } = tester.createPipeline();
		const contexts = corpus.map(file => {
			const context = factory.create(file.uri);

			contextService.contexts[file.uri.toString()] = context;

			return context;
		});

		await observer.measure('phase: parse', corpus.length, quads, () => {
			contexts.forEach((context, index) => context.parse(corpus[index].text));
		});

		await observer.measure('phase: loadTriples', corpus.length, quads, async () => {
			for (const [index, context] of contexts.entries()) {
				await context.loadTriples(corpus[index].text);
			}
		});

		await observer.measure('phase: diagnoseContent', corpus.length, quads, () => {
			corpus.forEach(file => diagnostics.diagnoseContent(file.uri, file.text));
		});

		await observer.measure('phase: releaseParseResult', corpus.length, quads, () => {
			contexts.forEach(context => tester.releaseParseResult(context));
		});

		await observer.measure('phase: infer', corpus.length, quads, async () => {
			for (const context of contexts) {
				await context.infer();
			}
		});

		const largeContext = contexts[contexts.length - 1];
		const largeGraph = largeContext.graphs[0];
		const largeQuads = tester.countQuads([largeFile]);

		await observer.measure('store: hasGraph x100 (large graph)', 1, largeQuads, () => {
			for (let index = 0; index < 100; index++) {
				store.hasGraph(largeGraph);
			}
		});

		await observer.measure('store: getGraphs x10', corpus.length, quads, () => {
			for (let index = 0; index < 10; index++) {
				store.getGraphs();
			}
		});

		await observer.measure('store: executeInference (large graph)', 1, largeQuads, () => {
			store.executeInference(largeGraph);
		});

		await observer.measure('store: reload large file (loadTriples again)', 1, largeQuads, async () => {
			if (isTokenizedDocumentContext(largeContext)) {
				largeContext.parse(largeFile.text);
			}

			await largeContext.loadTriples(largeFile.text);
		});
	});

	it('measures the load of the large file step by step', async () => {
		const largeQuads = tester.countQuads([largeFile]);
		const lexer = new TurtleLexer(createFileBlankNodeIdGenerator(largeFile.uri.toString()));
		const store = new Store();
		const graph = store.dataFactory.namedNode(largeFile.uri.toString());

		let tokens = lexer.tokenize(largeFile.text).tokens;
		let quads = new TurtleQuadReader().read(tokens);

		await observer.measure('large: tokenize', 1, largeQuads, () => {
			tokens = lexer.tokenize(largeFile.text).tokens;
		});

		await observer.measure('large: read quads (TurtleQuadReader)', 1, largeQuads, () => {
			quads = new TurtleQuadReader().read(tokens);
		});

		await observer.measure('large: read quads (TurtleParser + TurtleReader)', 1, largeQuads, () => {
			new TurtleReader().visit(new TurtleParser().parse(tokens, false));
		});

		await observer.measure('large: add to store', 1, largeQuads, () => {
			for (const quad of quads) {
				store.add(store.dataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
			}
		});
	});

	it('measures the SPARQL history post to the results webview', async () => {
		const generator = new CorpusGenerator(7);
		const historyRowCount = tester.historyEntryCount * tester.historyRowCount;

		await observer.measure('history: build entries', tester.historyEntryCount, historyRowCount, () => {
			harnessState.history = Array.from({ length: tester.historyEntryCount }, (_, index) => generator.generateQueryHistoryEntry(tester.historyRowCount, tester.historyRawResponseLength, index));
		});

		(vscode.window as any).registerWebviewViewProvider ??= () => ({ dispose: () => { } });

		const controller = new SparqlResultsController();

		let payloadBytes = 0;

		(controller as any).postMessage = (message: unknown) => {
			payloadBytes = JSON.stringify(message).length;
		};

		const post = await observer.measure('history: post to webview (serialize)', tester.historyEntryCount, historyRowCount, () => {
			(controller as any)._postQueryHistory();
		});

		process.stdout.write(`PERF ${JSON.stringify({ phase: 'history: payload bytes', bytes: payloadBytes, ms: post.ms })}\n`);

		harnessState.history = [];
		observer.printResults();
	});
});
