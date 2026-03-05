import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISparqlConnectionService } from '@src/services/interface';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const createSparqlConnection = {
	id: 'mentor.command.createSparqlConnection',
	handler: async () => {
		const service = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const endpoint = await service.createConnection();
		
		sparqlConnectionController.edit(endpoint);
	}
};