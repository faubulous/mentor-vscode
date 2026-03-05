import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISparqlQueryService } from '@src/services/interface';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};