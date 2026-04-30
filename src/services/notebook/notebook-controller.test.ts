import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockCreateQueryFromDocument, mockExecuteQuery } = vi.hoisted(() => ({
	mockCreateQueryFromDocument: vi.fn(() => ({ queryType: 'bindings' })),
	mockExecuteQuery: vi.fn(async (state: any) => state),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') {
				return { subscriptions: [] };
			}
			if (token === 'SparqlQueryService') {
				return {
					createQueryFromDocument: mockCreateQueryFromDocument,
					executeQuery: mockExecuteQuery,
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
	};
}

function makeCell(): vscode.NotebookCell {
	return {
		document: { uri: vscode.Uri.parse('untitled:query'), getText: () => 'SELECT * WHERE { ?s ?p ?o }' },
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
	mockCreateQueryFromDocument.mockReturnValue({ queryType: 'bindings' });
	mockExecuteQuery.mockImplementation(async (state: any) => state);
});

describe('NotebookController', () => {
	describe('_executeSparqlQuery', () => {
		it('should output application/sparql-results+json for bindings result', async () => {
			const mockExecution = makeExecution();
			const { executeHandler } = createControllerWithExecution(mockExecution);
			const cell = makeCell();

			mockCreateQueryFromDocument.mockReturnValue({ queryType: 'bindings' });
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

			mockCreateQueryFromDocument.mockReturnValue({ queryType: 'boolean' });
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

			mockCreateQueryFromDocument.mockReturnValue({ queryType: 'quads' });
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

			mockCreateQueryFromDocument.mockReturnValue({ queryType: 'bindings' });
			mockExecuteQuery.mockRejectedValue(new Error('query failed'));

			await executeHandler()!([cell], {}, {});
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockExecution.replaceOutput).toHaveBeenCalledOnce();
			const [outputs] = mockExecution.replaceOutput.mock.calls[0] as unknown as [vscode.NotebookCellOutput[]];
			expect(outputs[0].items[0].mime).toBe('application/vnd.code.notebook.error');
			expect(mockExecution.end).toHaveBeenCalledWith(false, expect.any(Number));
		});
	});
});

