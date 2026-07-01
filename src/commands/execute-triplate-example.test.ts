import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

let mockPreviewExample: Mock;
let examples: any[];

vi.mock('triplate', () => ({
	compile: vi.fn((_text: string) => ({
		examples,
		previewExample: (...args: any[]) => mockPreviewExample(...args),
	})),
}));

import * as vscode from 'vscode';
import { executeTriplateExample } from '@src/commands/execute-triplate-example';

function registerDoc(uri: string, languageId: string) {
	const document = { uri: vscode.Uri.parse(uri), languageId, getText: () => '---\nexample x {}\n---\n' };
	(vscode.workspace as any).textDocuments = [document];
	return document;
}

beforeEach(() => {
	examples = [{ id: 'people' }];
	mockPreviewExample = vi.fn(() => 'SELECT * WHERE {}');
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
});

describe('executeTriplateExample command', () => {
	it('has the correct id', () => {
		expect(executeTriplateExample.id).toBe('mentor.command.executeTriplateExample');
	});

	it('renders the named example and delegates to the render command', async () => {
		registerDoc('file:///q.sparql', 'sparql');

		await executeTriplateExample.handler('file:///q.sparql', 'people');

		expect(mockPreviewExample).toHaveBeenCalledWith('people');
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			'mentor.command.executeSparqlQueryFromString', 'SELECT * WHERE {}', 'file:///q.sparql', true
		);
	});

	it('shows an error for an unknown example id', async () => {
		registerDoc('file:///q.sparql', 'sparql');

		await executeTriplateExample.handler('file:///q.sparql', 'missing');

		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		expect(mockPreviewExample).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});
});
