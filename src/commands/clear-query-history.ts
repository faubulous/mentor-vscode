import { container, ISparqlQueryService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};