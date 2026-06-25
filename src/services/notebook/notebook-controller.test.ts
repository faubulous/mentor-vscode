import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const {
	mockCreateQuery,
	mockExecuteQuery,
	mockLoadDocument,
	mockHandleDocumentClosed,
	mockGetEffectiveShapeGraphs,
	mockValidateDocument,
	mockGetReportAsText,
	mockRender,
} = vi.hoisted(() => ({
	mockCreateQuery: vi.fn((_cell: any, query: string) => ({ queryType: 'bindings', query })),
	mockExecuteQuery: vi.fn(async (state: any) => state),
	mockLoadDocument: vi.fn(async () => ({})),
	mockHandleDocumentClosed: vi.fn(() => {}),
	mockGetEffectiveShapeGraphs: vi.fn(() => ['shapes:graph']),
	mockValidateDocument: vi.fn(async () => ({ conforms: true, results: [] })),
	mockGetReportAsText: vi.fn(() => 'SHACL Validation Report'),
	mockRender: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
}));

// Treat any text with a leading frontmatter fence as a template; compile yields a
// schema with no params so prompting is skipped and render is fully controlled.
vi.mock('triplate', () => ({
	isTemplate: (text: string) => text.trimStart().startsWith('---'),
	compile: vi.fn(() => ({
		schema: { params: [] },
		examples: [],
		previewExample: () => mockRender(),
		contextFromStrings: () => ({}),
		render: () => mockRender(),
	})),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') {
				return { subscriptions: [] };
			}
			if (token === 'SparqlQueryService') {
				return {
					createQuery: mockCreateQuery,
					executeQuery: mockExecuteQuery,
				};
			}
			if (token === 'DocumentContextService') {
				return {
					contexts: {},
					loadDocument: mockLoadDocument,
					handleDocumentClosed: mockHandleDocumentClosed,
				};
			}
			if (token === 'ShaclValidationService') {
				return {
					getEffectiveShapeGraphs: mockGetEffectiveShapeGraphs,
					validateDocument: mockValidateDocument,
					getReportAsText: mockGetReportAsText,
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { NotebookController } from '@src/services/notebook/notebook-controller';

function makeExecution() {
	return {
		executionOrder: 0,
		token: { onCancellationRequested: vi.fn(() => ({ dispose: () => {} })) },
		start: vi.fn(),
		end: vi.fn(),
		replaceOutput: vi.fn(async () => {}),
		clearOutput: vi.fn(async () => {}),
	};
}

function makeCell(languageId: string = 'sparql'): vscode.NotebookCell {
	return {
		document: { uri: vscode.Uri.parse('untitled:query'), languageId, getText: () => 'SELECT * WHERE { ?s ?p ?o }' },
	} as any;
}

/**
 * Creates a NotebookController with a controlled mock for createNotebookCellExecution,
 * and returns both the controller and a reference to the executeHandler for test invocation.
 */
function createControllerWithExecution(mockExecution: ReturnType<typeof makeExecution>) {
	let capturedExecuteHandler: ((cells: any[], notebook: any, controller: any) => void) | undefined;

	vi.spyOn(vscode.notebooks, 'createNotebookController').mockImplementation((_id, _type, _label) => ({
		set executeHandler(fn: any) { capturedExecuteHandler = fn; },
		get executeHandler() { return capturedExecuteHandler; },
		supportedLanguages: [] as string[],
		supportsExecutionOrder: false,
		createNotebookCellExecution: vi.fn(() => mockExecution),
		dispose: vi.fn(),
	}) as any);

	const controller = new NotebookController();
	return { controller, executeHandler: () => capturedExecuteHandler };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockCreateQuery.mockImplementation((_cell: any, query: string) => ({ queryType: 'bindings', query }));
	mockExecuteQuery.mockImplementation(async (state: any) => state);
	mockLoadDocument.mockResolvedValue({});
	mockGetEffectiveShapeGraphs.mockReturnValue(['shapes:graph']);
	mockValidateDocument.mockResolvedValue({ conforms: true, results: [] });
	mockGetReportAsText.mockReturnValue('SHACL Validation Report');
	mockRender.mockReturnValue('SELECT * WHERE { ?s ?p ?o }');
});

describe('NotebookController', () => {
	describe('_executeSparqlQuery', () => {
		it('should output application/sparql-results+json for bindings result', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell();

			mockCreateQuery.mockReturnValue({ queryType: 'bindings' });
			mockExecuteQuery.mockResolvedValue({ queryType: 'bindings', results: [] });

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('application/sparql-results+json');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});

		it('should output application/sparql-results+json for boolean result', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell();

			mockCreateQuery.mockReturnValue({ queryType: 'boolean' });
			mockExecuteQuery.mockResolvedValue({ queryType: 'boolean', result: { type: 'boolean', value: true } });

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('application/sparql-results+json');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});

		it('should output text/turtle for quads result', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell();

			mockCreateQuery.mockReturnValue({ queryType: 'quads' });
			mockExecuteQuery.mockResolvedValue({
				queryType: 'quads',
				result: { type: 'quads', document: '@prefix ex: <http://example.org/> .', mimeType: 'text/turtle' },
			});

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('text/turtle');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});

		it('should output error and call end(false) when executeQuery throws', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell();

			mockCreateQuery.mockReturnValue({ queryType: 'bindings' });
			mockExecuteQuery.mockRejectedValue(new Error('query failed'));

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('application/vnd.code.notebook.error');
			expect(mockExecution.end).toHaveBeenCalledWith(false, expect.any(Number));
		});
	});

	describe('_validateCell', () => {
		it('should validate (not run a query) for a turtle cell', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell('turtle');

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecuteQuery).not.toHaveBeenCalled();
			expect(mockValidateDocument).toHaveBeenCalledWith(cell.document.uri);
		});

		it('should output a conforms summary as text/plain when valid', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell('turtle');

			mockValidateDocument.mockResolvedValue({ conforms: true, results: [] });

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('text/plain');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});

		it('should output the text report and end(false) when issues are found', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell('turtle');

			mockValidateDocument.mockResolvedValue({ conforms: false, results: [{ messages: ['bad'] }] });

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockGetReportAsText).toHaveBeenCalledWith(cell.document.uri);
			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('text/plain');
			expect(mockExecution.end).toHaveBeenCalledWith(false, expect.any(Number));
		});

		it('should open shape configuration and produce no output when no shapes are configured', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell('turtle');

			mockGetEffectiveShapeGraphs.mockReturnValue([]);
			const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(executeCommand).toHaveBeenCalledWith('mentor.command.manageShaclShapes');
			expect(mockValidateDocument).not.toHaveBeenCalled();
			expect(mockExecution.replaceOutput).not.toHaveBeenCalled();
			expect(mockExecution.clearOutput).toHaveBeenCalled();
		});
	});

	describe('template cells', () => {
		function makeTemplateCell(languageId: string) {
			return {
				document: {
					uri: vscode.Uri.parse('untitled:template'),
					languageId,
					getText: () => '---\nparams {}\n---\nSELECT * WHERE { ?s ?p ?o }',
				},
			} as any as vscode.NotebookCell;
		}

		it('renders a SPARQL template and executes the rendered query in the cell', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);

			mockRender.mockReturnValue('SELECT ?x WHERE { ?x a ?t }');
			mockExecuteQuery.mockResolvedValue({ queryType: 'bindings', results: [] });

			await executeHandler()!([makeTemplateCell('sparql')], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			// The rendered query (not the raw template text) is what gets executed.
			expect(mockCreateQuery).toHaveBeenCalledWith(expect.anything(), 'SELECT ?x WHERE { ?x a ?t }');
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('application/sparql-results+json');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});

		it('renders an RDF template and SHACL-validates the result via the play button', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);

			mockRender.mockReturnValue('<urn:s> a <urn:o> .');
			(vscode.workspace as any).openTextDocument = vi.fn(async (opts: any) => ({
				uri: vscode.Uri.parse('untitled:rendered'),
				languageId: opts.language,
			}));

			await executeHandler()!([makeTemplateCell('turtle')], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			// The native play button validates the rendered content against the cell's shapes.
			expect(mockValidateDocument).toHaveBeenCalledWith(expect.anything(), ['shapes:graph']);
			expect(mockExecuteQuery).not.toHaveBeenCalled();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('text/plain');
			// The temporary rendered document context is cleaned up afterwards.
			expect(mockHandleDocumentClosed).toHaveBeenCalled();
		});
	});

	describe('renderContentInCell', () => {
		it('shows the rendered RDF as text/turtle without validating (code-lens path)', async () => {
			const mockExecution = makeExecution();
			const { controller } = createControllerWithExecution(mockExecution);
			const cell = makeCell('turtle');

			await controller.renderContentInCell(cell, '<urn:s> a <urn:o> .');

			expect(mockValidateDocument).not.toHaveBeenCalled();
			expect(mockExecuteQuery).not.toHaveBeenCalled();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('text/turtle');
			expect(mockExecution.end).toHaveBeenCalledWith(true, expect.any(Number));
		});
	});
});

