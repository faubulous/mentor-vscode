import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecuteHandler } = vi.hoisted(() => ({
	mockExecuteHandler: vi.fn(async () => undefined),
}));

vi.mock('@src/commands/execute-describe-query', () => ({
	executeDescribeQuery: { id: 'mentor.command.executeDescribeQuery', handler: mockExecuteHandler },
}));

vi.mock('@src/views/trees/definition-tree/definition-tree-node', () => {
	class DefinitionTreeNode {
		constructor(public document: any, public uri: string) { }
	}

	return {
		DefinitionTreeNode,
		getIriFromArgument: (arg: any) => (arg instanceof DefinitionTreeNode ? arg.uri : arg),
	};
});

import { describeResource } from '@src/commands/describe-resource';
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('describeResource', () => {
	it('has the correct command id', () => {
		expect(describeResource.id).toBe('mentor.command.describeResource');
	});

	it('describes the resource of a tree node using its document URI', async () => {
		const docUri = { toString: () => 'file:///doc.ttl' };
		const node = new DefinitionTreeNode({ uri: docUri }, 'http://example.org/Person') as any;

		await describeResource.handler(node);

		expect(mockExecuteHandler).toHaveBeenCalledWith(docUri, 'http://example.org/Person');
	});

	it('does nothing when the argument is not a tree node', async () => {
		await describeResource.handler('http://example.org/Person');

		expect(mockExecuteHandler).not.toHaveBeenCalled();
	});
});
