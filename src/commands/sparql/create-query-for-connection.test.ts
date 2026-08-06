import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSetQuerySource } = vi.hoisted(() => ({
	mockSetQuerySource: vi.fn(async () => undefined),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({
			setQuerySourceForDocument: mockSetQuerySource,
		})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({
		get: (_key: string, defaultValue?: any) => 'SELECT * WHERE { ?s ?p ?o . }',
	}),
}));

import * as vscode from 'vscode';
import { createQueryForConnection } from '@src/commands/sparql/create-query-for-connection';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('createQueryForConnection', () => {
	it('should have the correct command id', () => {
		expect(createQueryForConnection.id).toBe('mentor.command.createQueryForConnection');
	});

	it('creates a SPARQL document from the template and binds the connection', async () => {
		const fakeDoc = { uri: { toString: () => 'untitled:1' } };
		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockResolvedValue(fakeDoc);
		const showDoc = vi.spyOn(vscode.window as any, 'showTextDocument').mockResolvedValue(undefined);

		await createQueryForConnection.handler('conn-1');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ language: 'sparql', content: 'SELECT * WHERE { ?s ?p ?o . }' })
		);
		expect(showDoc).toHaveBeenCalledWith(fakeDoc);
		expect(mockSetQuerySource).toHaveBeenCalledWith(fakeDoc.uri, 'conn-1');
	});
});
