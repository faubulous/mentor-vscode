import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { saveSparqlQueryResults } from '@src/commands/sparql/save-sparql-query-results';

/**
 * Returns an execution context holding a bindings result with the given columns and rows.
 */
function givenBindings(columns: string[], rows: Record<string, any>[]): any {
	return { result: { type: 'bindings', columns, rows, namespaceMap: {} } };
}

/**
 * Returns the document descriptor the handler passed to `openTextDocument`.
 */
function getOpenedDocument(): any {
	return (vscode.workspace.openTextDocument as any).mock.calls[0][0];
}

beforeEach(() => {
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:result'),
	}));
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
});

describe('saveSparqlQueryResults command', () => {
	it('should have correct id', () => {
		expect(saveSparqlQueryResults.id).toBe('mentor.command.saveSparqlQueryResults');
	});

	it('should not open a document when there is no tabular result', async () => {
		await saveSparqlQueryResults.handler({ result: undefined } as any);

		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});

	it('should not throw when invoked without a context', async () => {
		await expect(saveSparqlQueryResults.handler(undefined)).resolves.toBeUndefined();

		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});

	it('should serialize bindings result to CSV format', async () => {
		const context = givenBindings(['s', 'p', 'o'], [{
			s: { termType: 'NamedNode', value: 'http://example.org/s' },
			p: { termType: 'NamedNode', value: 'http://example.org/p' },
			o: { termType: 'Literal', value: 'hello world' },
		}]);

		await saveSparqlQueryResults.handler(context);

		const document = getOpenedDocument();

		expect(document.language).toBe('csv');
		expect(document.content).toBe('"s","p","o"\n"http://example.org/s","http://example.org/p","hello world"');
	});

	it('should escape double quotes in literal values', async () => {
		const context = givenBindings(['label'], [{ label: { termType: 'Literal', value: 'a "quoted" word' } }]);

		await saveSparqlQueryResults.handler(context);

		expect(getOpenedDocument().content).toContain('"a ""quoted"" word"');
	});

	it('should keep single quotes unchanged', async () => {
		const context = givenBindings(['label'], [{ label: { termType: 'Literal', value: "it's a test" } }]);

		await saveSparqlQueryResults.handler(context);

		expect(getOpenedDocument().content).toContain(`"it's a test"`);
	});

	it('should handle missing column values', async () => {
		const context = givenBindings(['s', 'label'], [{ s: { termType: 'NamedNode', value: 'http://example.org/s' } }]);

		await saveSparqlQueryResults.handler(context);

		expect(getOpenedDocument().content).toBe('"s","label"\n"http://example.org/s",""');
	});

	it('should serialize bindings result to a Markdown table', async () => {
		const context = givenBindings(['s', 'label'], [{
			s: { termType: 'NamedNode', value: 'http://example.org/s' },
			label: { termType: 'Literal', value: 'Alice' },
		}]);

		await saveSparqlQueryResults.handler(context, 'markdown');

		const document = getOpenedDocument();

		expect(document.language).toBe('markdown');
		expect(document.content).toBe('| s | label |\n| --- | --- |\n| http://example.org/s | Alice |');
	});

	it('should serialize bindings result to SPARQL results JSON', async () => {
		const context = givenBindings(['label'], [{ label: { termType: 'Literal', value: 'Alice' } }]);

		await saveSparqlQueryResults.handler(context, 'json');

		const document = getOpenedDocument();

		expect(document.language).toBe('json');
		expect(JSON.parse(document.content)).toEqual({
			head: { vars: ['label'] },
			results: { bindings: [{ label: { type: 'literal', value: 'Alice' } }] }
		});
	});
});
