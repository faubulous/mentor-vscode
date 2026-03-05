import { container, WorkspaceIndexer } from '@src/container';
import { InjectionToken } from '@src/injection-token';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		container.resolve<WorkspaceIndexer>(InjectionToken.WorkspaceIndexer).indexWorkspace(true);
	}
};