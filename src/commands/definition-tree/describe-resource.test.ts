import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const { mockExecuteHandler } = vi.hoisted(() => ({
	mockExecuteHandler: vi.fn(async () => undefined),
}));

vi.mock('@src/commands/sparql/execute-describe-query', () => ({
	executeDescribeQuery: { id: 'mentor.command.executeDescribeQuery', handler: mockExecuteHandler },
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (target: any) => target,
	inject: () => () => { },
	singleton: () => (target: any) => target,
}));

import { describeResource } from '@src/commands/definition-tree/describe-resource';
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';
import { createMockDocumentContext } from '@src/utilities/mocks/factories';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('describeResource', () => {
	it('has the correct command id', () => {
		expect(describeResource.id).toBe('mentor.command.describeResource');
	});

	it('describes the resource of a tree node using its document URI', async () => {
		const docUri = vscode.Uri.parse('file:///doc.ttl');
		const iri = 'http://example.org/Person';
		const node = new DefinitionTreeNode(createMockDocumentContext({ uri: docUri }), iri, iri);

		await describeResource.handler(node);

		expect(mockExecuteHandler).toHaveBeenCalledWith(docUri, iri);
	});

	it('does nothing when the argument is not a tree node', async () => {
		await describeResource.handler('http://example.org/Person');

		expect(mockExecuteHandler).not.toHaveBeenCalled();
	});
});
