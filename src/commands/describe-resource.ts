import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';
import { executeDescribeQuery } from './execute-describe-query';

/**
 * Runs a DESCRIBE query for the resource represented by a definition tree node.
 * Invoked from the definition tree item context menu.
 */
export const describeResource = {
	id: 'mentor.command.describeResource',
	handler: async (arg: DefinitionTreeNode | string) => {
		const iri = getIriFromArgument(arg);

		if (!(arg instanceof DefinitionTreeNode)) {
			return;
		}

		await executeDescribeQuery.handler(arg.document.uri, iri);
	}
};
