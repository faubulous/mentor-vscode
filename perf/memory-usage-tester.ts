import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { OwlReasoner, Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from '@src/services/document/document-factory';
import { DocumentTokenSource } from '@src/services/document/document-token-source';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { createTestSettings } from '@src/utilities/mocks/factories';
import { CorpusGenerator } from './corpus-generator';

const QUADS_PER_CLASS = 4;

/**
 * A file of the corpus: its URI and Turtle text.
 */
export interface CorpusFile {
	uri: vscode.Uri;
	text: string;
}

/**
 * Provides the inputs and the object graph of the memory usage harness: the
 * corpus, the indexing pipeline and the sizes configured through `PERF_*`
 * environment variables. The test module must mock `vscode` before using it.
 */
export class MemoryUsageTester {
	/**
	 * The number of generated small files (`PERF_FILES`).
	 */
	readonly smallFileCount = this._readIntegerSetting('PERF_FILES', 100);

	/**
	 * The number of classes per generated small file (`PERF_CLASSES`).
	 */
	readonly smallFileClassCount = this._readIntegerSetting('PERF_CLASSES', 500);

	/**
	 * The number of classes in the generated large file (`PERF_LARGE_CLASSES`).
	 */
	readonly largeFileClassCount = this._readIntegerSetting('PERF_LARGE_CLASSES', 50000);

	/**
	 * The number of SPARQL query history entries (`PERF_HISTORY_ENTRIES`).
	 */
	readonly historyEntryCount = this._readIntegerSetting('PERF_HISTORY_ENTRIES', 10);

	/**
	 * The number of result rows per history entry (`PERF_HISTORY_ROWS`).
	 */
	readonly historyRowCount = this._readIntegerSetting('PERF_HISTORY_ROWS', 100000);

	/**
	 * The length of the raw response body per history entry (`PERF_HISTORY_RAW_CHARS`).
	 */
	readonly historyRawResponseLength = this._readIntegerSetting('PERF_HISTORY_RAW_CHARS', 5000000);

	/**
	 * Builds the corpus: either every Turtle file below `PERF_CORPUS`, or a
	 * generated workspace of many small files plus one large file, which is last.
	 * @returns The files of the corpus.
	 */
	loadCorpus(): CorpusFile[] {
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

		for (const [uri, text] of generator.generateWorkspace(this.smallFileCount, this.smallFileClassCount)) {
			files.push({ uri: vscode.Uri.parse(uri), text });
		}

		files.push({
			uri: vscode.Uri.parse('file:///perf/large.ttl'),
			text: generator.generateOntologyTurtle(this.largeFileClassCount, 'http://example.org/perf/large/')
		});

		return files;
	}

	/**
	 * Counts the quads of generated corpus files from their class declarations.
	 * @param files The corpus files.
	 * @returns The number of quads.
	 */
	countQuads(files: CorpusFile[]): number {
		return files.reduce((sum, file) => sum + (file.text.match(/ a owl:Class ;/g)?.length ?? 0) * QUADS_PER_CLASS, 0);
	}

	/**
	 * Builds the production object graph of the indexing pipeline the same way
	 * the service container builds it.
	 * @returns The store, the document factory and the context and diagnostics services.
	 */
	createPipeline() {
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
	 * @param context A document context.
	 */
	releaseParseResult(context: IDocumentContext): void {
		const releasable = context as IDocumentContext & { releaseParseResult?: () => void };

		if (typeof releasable.releaseParseResult === 'function') {
			releasable.releaseParseResult();
		}
	}

	/**
	 * Reads an integer from an environment variable.
	 * @param name The name of the environment variable.
	 * @param fallback The value to use when the variable is not set or not a number.
	 * @returns The integer value.
	 */
	private _readIntegerSetting(name: string, fallback: number): number {
		const value = Number.parseInt(process.env[name] ?? '', 10);

		return Number.isFinite(value) ? value : fallback;
	}
}
