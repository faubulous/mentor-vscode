import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SparqlConnectionController } from '@src/views/webviews';

export const editSparqlConnection = {
	id: 'mentor.command.editSparqlConnection',
	handler: async (endpoint: SparqlConnection) => {
		const controller = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
		controller.edit(endpoint);
	}
};