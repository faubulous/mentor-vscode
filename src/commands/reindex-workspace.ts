import { container } from 'tsyringe';
import { Store } from "@faubulous/mentor-rdf";
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';

export const reindexWorkspace = {
	id: 'mentor.command.reindexWorkspace',
	handler: async () => {
		const store = container.resolve<Store>(ServiceToken.Store);

		// Clear all graphs..
		store.deleteGraphs(store.getGraphs());

		await store.loadFrameworkOntologies();

		// Reindex the workspace files..
		const workspaceIndexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		await workspaceIndexer.indexWorkspace(true);
	}
};