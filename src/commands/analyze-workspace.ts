import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexer } from '@src/services/interfaces';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<IWorkspaceIndexer>(ServiceToken.WorkspaceIndexer).indexWorkspace(true);
	}
};