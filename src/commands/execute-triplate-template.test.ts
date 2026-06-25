import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

let mockRender: Mock;
let mockPreviewExample: Mock;
let schemaParams: any[];
let exampleSets: any[];

vi.mock('triplate', () => ({
	compile: vi.fn((_text: string) => ({
		schema: { params: schemaParams },
		examples: exampleSets,
		previewExample: (...args: any[]) => mockPreviewExample(...args),
		// Mirrors triplate's schema-aware coercion of raw string inputs.
		contextFromStrings: (inputs: Record<string, string | undefined>) => {
			const context: Record<string, unknown> = {};

			for (const param of schemaParams) {
				const raw = inputs[param.name];

				if (raw === undefined || raw === '') {
					continue;
				}

				context[param.name] = param.type.base.kind === 'int' ? parseInt(raw, 10) : raw;
			}

			return context;
		},
		render: (...args: any[]) => mockRender(...args),
	})),
}));

import * as vscode from 'vscode';
import { executeTriplateTemplate } from '@src/commands/execute-triplate-template';

function registerDoc(uri: string, languageId: string, text: string) {
	const document = { uri: vscode.Uri.parse(uri), languageId, getText: () => text };
	(vscode.workspace as any).textDocuments = [document];
	return document;
}

beforeEach(() => {
	schemaParams = [
		{ name: 'type', type: { base: { kind: 'iri' }, array: false, optional: false } },
		{ name: 'limit', type: { base: { kind: 'int' }, array: false, optional: true } },
	];
	exampleSets = [];
	mockRender = vi.fn(() => 'SELECT * WHERE {}');
	mockPreviewExample = vi.fn(() => 'SELECT example WHERE {}');
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInputBox = vi.fn(async () => '');
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
});

describe('executeTriplateTemplate command', () => {
	it('has the correct id', () => {
		expect(executeTriplateTemplate.id).toBe('mentor.command.executeTriplateTemplate');
	});

	it('prompts for parameters, renders, and delegates to the render command', async () => {
		(vscode.window as any).showInputBox = vi.fn()
			.mockResolvedValueOnce('http://example.org/Person')
			.mockResolvedValueOnce('10');

		registerDoc('file:///q.sparql', 'sparql', '---\nparams { type: iri }\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(mockRender).toHaveBeenCalledWith({ type: 'http://example.org/Person', limit: 10 });
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			'mentor.command.executeSparqlQueryFromString', 'SELECT * WHERE {}', 'file:///q.sparql'
		);
	});

	it('aborts when a prompt is cancelled', async () => {
		(vscode.window as any).showInputBox = vi.fn().mockResolvedValueOnce(undefined);

		registerDoc('file:///q.sparql', 'sparql', '---\nparams { type: iri }\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(mockRender).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});

	it('offers declared examples and runs the chosen example', async () => {
		exampleSets = [{ id: 'people' }];
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: 'people', exampleId: 'people' }));

		registerDoc('file:///q.sparql', 'sparql', '---\nexample people {}\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(vscode.window.showQuickPick).toHaveBeenCalled();
		expect(mockPreviewExample).toHaveBeenCalledWith('people');
		expect(mockRender).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			'mentor.command.executeSparqlQueryFromString', 'SELECT example WHERE {}', 'file:///q.sparql'
		);
	});

	it('falls through to manual entry when that option is chosen', async () => {
		exampleSets = [{ id: 'people' }];
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: 'Enter values manually…' }));
		(vscode.window as any).showInputBox = vi.fn()
			.mockResolvedValueOnce('http://example.org/Person')
			.mockResolvedValueOnce('10');

		registerDoc('file:///q.sparql', 'sparql', '---\nexample people {}\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(mockPreviewExample).not.toHaveBeenCalled();
		expect(mockRender).toHaveBeenCalledWith({ type: 'http://example.org/Person', limit: 10 });
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			'mentor.command.executeSparqlQueryFromString', 'SELECT * WHERE {}', 'file:///q.sparql'
		);
	});

	it('aborts when the example QuickPick is cancelled', async () => {
		exampleSets = [{ id: 'people' }];
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);

		registerDoc('file:///q.sparql', 'sparql', '---\nexample people {}\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(mockPreviewExample).not.toHaveBeenCalled();
		expect(mockRender).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});

	it('warns when the document cannot be resolved', async () => {
		(vscode.workspace as any).textDocuments = [];
		await executeTriplateTemplate.handler('file:///missing.sparql');
		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
	});
});
