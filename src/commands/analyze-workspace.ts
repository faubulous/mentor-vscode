import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { IWorkspaceIndexer } from '@src/services/interface';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<IWorkspaceIndexer>(ServiceToken.WorkspaceIndexer).indexWorkspace(true);
	}
};