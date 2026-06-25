import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockContextService, mockExecuteHandler } = vi.hoisted(() => ({
	mockContextService: { contexts: {} as Record<string, any> },
	mockExecuteHandler: vi.fn(async () => undefined),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => (token === 'DocumentContextService' ? mockContextService : {})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

vi.mock('@src/commands/execute-describe-query', () => ({
	executeDescribeQuery: { id: 'mentor.command.executeDescribeQuery', handler: mockExecuteHandler },
}));

import * as vscode from 'vscode';
import { describeResourceFromPosition } from '@src/commands/describe-resource-from-position';

const uriStr = 'file:///doc.ttl';

beforeEach(() => {
	vi.clearAllMocks();
	mockContextService.contexts = {};
	(vscode.window as any).activeTextEditor = undefined;
	(vscode.window as any).showInformationMessage = vi.fn();
});

describe('describeResourceFromPosition', () => {
	it('has the correct command id', () => {
		expect(describeResourceFromPosition.id).toBe('mentor.command.describeResourceFromPosition');
	});

	it('returns silently when there is no active editor', async () => {
		await describeResourceFromPosition.handler();

		expect(mockExecuteHandler).not.toHaveBeenCalled();
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('describes the resource at the caret', async () => {
		const docUri = { toString: () => uriStr };
		(vscode.window as any).activeTextEditor = {
			document: { uri: docUri },
			selection: { active: { line: 1, character: 2 } },
		};
		mockContextService.contexts[uriStr] = { getIriAtPosition: vi.fn(() => 'http://example.org/Person') };

		await describeResourceFromPosition.handler();

		expect(mockExecuteHandler).toHaveBeenCalledWith(docUri, 'http://example.org/Person');
	});

	it('shows an info message when there is no resource at the caret', async () => {
		const docUri = { toString: () => uriStr };
		(vscode.window as any).activeTextEditor = {
			document: { uri: docUri },
			selection: { active: { line: 0, character: 0 } },
		};
		mockContextService.contexts[uriStr] = { getIriAtPosition: vi.fn(() => undefined) };

		await describeResourceFromPosition.handler();

		expect(mockExecuteHandler).not.toHaveBeenCalled();
		expect(vscode.window.showInformationMessage).toHaveBeenCalled();
	});
});
