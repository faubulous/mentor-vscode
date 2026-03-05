import { container } from '../container';
import { InjectionToken } from '@src/injection-token';
import { SparqlQueryService } from '../services';

export const clearQueryHistory = {
	id: 'mentor.command.clearQueryHistory',
	handler: () => {
		const service = container.resolve<SparqlQueryService>(InjectionToken.SparqlQueryService);
		service.clearQueryHistory();
	}
};