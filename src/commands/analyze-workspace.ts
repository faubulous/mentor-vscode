import { mentor } from '../mentor';

export async function analyzeWorkspace() {
	// Force re-indexing of the workspace, including oversized files.
	mentor.workspaceIndexer.indexWorkspace(true);
}