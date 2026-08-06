import { container } from 'tsyringe';
import { Store } from "@faubulous/mentor-rdf";
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';

export const reindexWorkspace = {
	id: 'mentor.command.reindexWorkspace',
	handler: async () => {
		const store = container.resolve<Store>(ServiceToken.Store);

		// Clear all graphs..
		store.deleteGraphs(store.getGraphs());

		await store.loadFrameworkOntologies();

		// Restore the preset and user shape graphs that the wipe removed.
		await container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService).loadAll();

		// Reindex the workspace files..
		const workspaceIndexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		await workspaceIndexer.indexWorkspace(true);
	}
};