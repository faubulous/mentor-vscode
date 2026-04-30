import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockDeletePrefixes: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'TurtlePrefixDefinitionService') {
				return {
					deletePrefixes: (...args: any[]) => mockDeletePrefixes(...args),
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
import { deletePrefixes } from '@src/commands/delete-prefixes';

beforeEach(() => {
	mockDeletePrefixes = vi.fn(async () => ({ size: 0 }));
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('deletePrefixes command', () => {
	it('should have correct id', () => {
		expect(deletePrefixes.id).toBe('mentor.command.deletePrefixes');
	});

	it('should do nothing if document is not in workspace', async () => {
		(vscode.workspace as any).textDocuments = [];
		const uri = vscode.Uri.parse('file:///test.ttl');
		await deletePrefixes.handler(uri, ['ex']);
		expect(mockDeletePrefixes).not.toHaveBeenCalled();
	});

	it('should not applyEdit when edit size is 0', async () => {
		const uri = vscode.Uri.parse('file:///test.ttl');
		const mockDoc = { uri } as any;
		(vscode.workspace as any).textDocuments = [mockDoc];
		mockDeletePrefixes.mockResolvedValue({ size: 0 });
		await deletePrefixes.handler(uri, ['ex']);
		expect(mockDeletePrefixes).toHaveBeenCalledWith(mockDoc, ['ex']);
		expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
	});

	it('should applyEdit when edit size > 0', async () => {
		const uri = vscode.Uri.parse('file:///test.ttl');
		const mockDoc = { uri } as any;
		(vscode.workspace as any).textDocuments = [mockDoc];
		const fakeEdit = { size: 1 };
		mockDeletePrefixes.mockResolvedValue(fakeEdit);
		await deletePrefixes.handler(uri, ['ex']);
		expect(vscode.workspace.applyEdit).toHaveBeenCalledWith(fakeEdit);
	});
});
