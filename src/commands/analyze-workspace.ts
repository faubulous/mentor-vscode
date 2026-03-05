import { container, WorkspaceIndexer } from '@src/container';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve(WorkspaceIndexer).indexWorkspace(true);
	}
};