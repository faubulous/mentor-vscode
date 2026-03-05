import { container } from '../service-container';
import { ServiceToken } from '@src/service-token';
import { SparqlQueryService } from '../services';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<SparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};