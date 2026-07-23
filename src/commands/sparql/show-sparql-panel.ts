import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlResultsController } from '@src/views/webviews';

/**
 * Opens the SPARQL results panel on its welcome tab. Invoked by the SPARQL
 * status bar item: opening the panel this way is a navigation action, so the
 * welcome hub is shown instead of restoring the last active query tab.
 * Executing a query still selects the query's own tab.
 */
export const showSparqlPanel = {
	id: 'mentor.command.showSparqlPanel',
	handler: async () => {
		const controller = container.resolve<SparqlResultsController>(ServiceToken.SparqlResultsController);
		await controller.showWelcome();
	}
};
