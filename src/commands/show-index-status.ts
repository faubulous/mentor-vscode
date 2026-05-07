import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core/workspace-indexer.interface';

export const showIndexStatus = {
	id: 'mentor.command.showIndexStatus',
	handler: () => {
		const indexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		indexer.showIndexStatus();
	}
};
