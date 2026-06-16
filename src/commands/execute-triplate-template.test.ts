import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockRender: Mock;
let schemaParams: any[];

vi.mock('triplate', () => ({
	compile: vi.fn((_text: string) => ({
		schema: { params: schemaParams },
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
	mockRender = vi.fn(() => 'SELECT * WHERE {}');
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
			'mentor.command.openRenderedTriplate', 'file:///q.sparql', 'SELECT * WHERE {}'
		);
	});

	it('aborts when a prompt is cancelled', async () => {
		(vscode.window as any).showInputBox = vi.fn().mockResolvedValueOnce(undefined);

		registerDoc('file:///q.sparql', 'sparql', '---\nparams { type: iri }\n---\nSELECT * WHERE {}');

		await executeTriplateTemplate.handler('file:///q.sparql');

		expect(mockRender).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});

	it('warns when the document cannot be resolved', async () => {
		(vscode.workspace as any).textDocuments = [];
		await executeTriplateTemplate.handler('file:///missing.sparql');
		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
	});
});
