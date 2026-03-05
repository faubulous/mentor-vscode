import { container } from '@src/services/service-container';
import { ServiceToken, IWorkspaceIndexer } from '@src/services';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<IWorkspaceIndexer>(ServiceToken.WorkspaceIndexer).indexWorkspace(true);
	}
};