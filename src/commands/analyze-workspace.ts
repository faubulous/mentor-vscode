import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { IWorkspaceIndexer } from '@src/services/interface';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<IWorkspaceIndexer>(ServiceToken.WorkspaceIndexer).indexWorkspace(true);
	}
};