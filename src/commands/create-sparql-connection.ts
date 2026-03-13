import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlConnectionController } from '@src/views/webviews';

export const createSparqlConnection = {
	id: 'mentor.command.createSparqlConnection',
	handler: async () => {
		const service = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const endpoint = await service.createConnection();
		
		const controller = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
		controller.edit(endpoint);
	}
};