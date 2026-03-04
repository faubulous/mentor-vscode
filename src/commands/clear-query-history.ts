import { container } from '../container';
import { SparqlQueryService } from '../services';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve(SparqlQueryService);
		service.clearQueryHistory();
	}
};