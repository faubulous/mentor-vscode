import { mentor } from '../mentor';

export const analyzeWorkspace = {
	id: 'mentor.command.analyzeWorkspace',
	handler: () => {
		// Force re-indexing of the workspace, including oversized files.
		mentor.workspaceIndexer.indexWorkspace(true);
	}
};