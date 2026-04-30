import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mockVscode from '@src/utilities/mocks/vscode';
vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockPrefixService: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'TurtlePrefixDefinitionService') return mockPrefixService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

beforeEach(() => {
	mockPrefixService = {
		sortPrefixes: vi.fn(async () => ({ size: 0 })),
	};
	(mockVscode.workspace as any).textDocuments = [];
});

afterEach(() => {
	(mockVscode.workspace as any).textDocuments = [];
});

import { sortPrefixes } from '@src/commands/sort-prefixes';

describe('sortPrefixes command', () => {
	it('should have the correct id', () => {
		expect(sortPrefixes.id).toBe('mentor.command.sortPrefixes');
	});

	it('should do nothing when document is not in textDocuments', async () => {
		(mockVscode.workspace as any).textDocuments = [];
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		await sortPrefixes.handler(uri);
		expect(mockPrefixService.sortPrefixes).not.toHaveBeenCalled();
	});

	it('should call sortPrefixes on service when document is found', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => '' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		await sortPrefixes.handler(uri);
		expect(mockPrefixService.sortPrefixes).toHaveBeenCalledWith(fakeDoc);
	});

	it('should apply edit when edit has changes', async () => {
		const uri = (mockVscode as any).Uri.parse('file:///test.ttl');
		const fakeDoc = { uri, getText: () => '' };
		(mockVscode.workspace as any).textDocuments = [fakeDoc];
		mockPrefixService.sortPrefixes = vi.fn(async () => ({ size: 3 }));
		const applyEditSpy = vi.spyOn(mockVscode.workspace, 'applyEdit');
		await sortPrefixes.handler(uri);
		expect(applyEditSpy).toHaveBeenCalled();
	});
});
