import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SparqlConnectionService } from '@src/services/shared/sparql-connection-service';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const createSparqlConnection = {
	id: 'mentor.command.createSparqlConnection',
	handler: async () => {
		const service = container.resolve<SparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const endpoint = await service.createConnection();
		
		sparqlConnectionController.edit(endpoint);
	}
};