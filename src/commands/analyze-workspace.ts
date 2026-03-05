import { container, WorkspaceIndexer } from '@src/service-container';
import { ServiceToken } from '@src/service-token';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<WorkspaceIndexer>(ServiceToken.WorkspaceIndexer).indexWorkspace(true);
	}
};