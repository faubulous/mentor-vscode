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
import { saveSparqlQueryResults } from '@src/commands/save-sparql-query-results';

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

	it('should open empty document when result has no bindings type', async () => {
		const context = { result: undefined } as any;
		await saveSparqlQueryResults.handler(context);
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ content: '', language: 'csv' });
	});

	it('should serialize bindings result to CSV format', async () => {
		const context = {
			result: {
				type: 'bindings',
				columns: ['s', 'p', 'o'],
				rows: [
					{
						s: { termType: 'NamedNode', value: 'http://example.org/s' },
						p: { termType: 'NamedNode', value: 'http://example.org/p' },
						o: { termType: 'Literal', value: 'hello world' },
					},
				],
			},
		} as any;
		await saveSparqlQueryResults.handler(context);
		const callArgs = (vscode.workspace.openTextDocument as any).mock.calls[0][0];
		expect(callArgs.language).toBe('csv');
		expect(callArgs.content).toContain('s, p, o');
		expect(callArgs.content).toContain('http://example.org/s');
		expect(callArgs.content).toContain('"hello world"');
	});

	it('should escape single quotes in literal values', async () => {
		const context = {
			result: {
				type: 'bindings',
				columns: ['label'],
				rows: [
					{
						label: { termType: 'Literal', value: "it's a test" },
					},
				],
			},
		} as any;
		await saveSparqlQueryResults.handler(context);
		const callArgs = (vscode.workspace.openTextDocument as any).mock.calls[0][0];
		expect(callArgs.content).toContain("it''s a test");
	});

	it('should handle missing column values', async () => {
		const context = {
			result: {
				type: 'bindings',
				columns: ['s', 'label'],
				rows: [{ s: { termType: 'NamedNode', value: 'http://example.org/s' } }],
			},
		} as any;
		await saveSparqlQueryResults.handler(context);
		const callArgs = (vscode.workspace.openTextDocument as any).mock.calls[0][0];
		expect(callArgs.content).toContain('http://example.org/s');
	});
});
