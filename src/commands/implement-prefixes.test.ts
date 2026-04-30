import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockImplementPrefixes: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'TurtlePrefixDefinitionService') {
				return {
					implementPrefixes: (...args: any[]) => mockImplementPrefixes(...args),
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
import { implementPrefixes } from '@src/commands/implement-prefixes';

beforeEach(() => {
	mockImplementPrefixes = vi.fn(async () => ({ size: 0 }));
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('implementPrefixes command', () => {
	it('should have correct id', () => {
		expect(implementPrefixes.id).toBe('mentor.command.implementPrefixes');
	});

	it('should do nothing if document is not in workspace', async () => {
		(vscode.workspace as any).textDocuments = [];
		const uri = vscode.Uri.parse('file:///test.ttl');
		await implementPrefixes.handler(uri, ['ex']);
		expect(mockImplementPrefixes).not.toHaveBeenCalled();
	});

	it('should not applyEdit when edit size is 0', async () => {
		const uri = vscode.Uri.parse('file:///test.ttl');
		const mockDoc = { uri } as any;
		(vscode.workspace as any).textDocuments = [mockDoc];
		mockImplementPrefixes.mockResolvedValue({ size: 0 });
		await implementPrefixes.handler(uri, ['ex']);
		expect(mockImplementPrefixes).toHaveBeenCalledWith(mockDoc, [{ prefix: 'ex', namespaceIri: undefined }]);
		expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
	});

	it('should applyEdit when edit size > 0', async () => {
		const uri = vscode.Uri.parse('file:///test.ttl');
		const mockDoc = { uri } as any;
		(vscode.workspace as any).textDocuments = [mockDoc];
		const fakeEdit = { size: 2 };
		mockImplementPrefixes.mockResolvedValue(fakeEdit);
		await implementPrefixes.handler(uri, ['ex', 'owl']);
		expect(vscode.workspace.applyEdit).toHaveBeenCalledWith(fakeEdit);
	});
});
