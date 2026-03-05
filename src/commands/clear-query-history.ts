import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISparqlQueryService } from '@src/services/interface';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};