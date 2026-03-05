import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SparqlQueryService } from '@src/services/shared/sparql-query-service';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<SparqlQueryService>(ServiceToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};