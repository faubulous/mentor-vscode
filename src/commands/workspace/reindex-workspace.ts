import { container } from 'tsyringe';
import { Store } from "@faubulous/mentor-rdf";
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceFileService, IWorkspaceIndexerService } from '@src/services/core';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';
import { loadFrameworkVocabularies } from '@src/services/core/preset-graphs';

export const reindexWorkspace = {
	id: 'mentor.command.reindexWorkspace',
	handler: async () => {
		const store = container.resolve<Store>(ServiceToken.Store);

		// Replace the store's contents wholesale: deleting the graphs one quad at a
		// time took seconds on a large workspace and released no memory, because
		// the store's term dictionary never shrinks.
		store.clear();

		loadFrameworkVocabularies(store);

		// Restore the preset and user shape graphs that the wipe removed.
		await container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService).loadAll();

		// Rediscover the workspace files, so the index also recovers from file system
		// changes the file watcher did not report.
		await container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService).discoverFiles();

		// Reindex the workspace files..
		const workspaceIndexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		await workspaceIndexer.indexWorkspace(true);
	}
};