import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SparqlConnectionService } from '@src/services';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const createSparqlConnection = {
	id: 'mentor.command.createSparqlConnection',
	handler: async () => {
		const service = container.resolve<SparqlConnectionService>(InjectionToken.SparqlConnectionService);
		const endpoint = await service.createConnection();
		
		sparqlConnectionController.edit(endpoint);
	}
};