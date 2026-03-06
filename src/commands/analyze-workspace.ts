import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService).indexWorkspace(true);
	}
};