import { v4 as uuidv4 } from 'uuid';
import { SparqlConnection, SparqlConnectionScope } from './sparql-connection';

/**
 * A factory for creating new SparqlConnection objects.
 */
export class SparqlConnectionFactory {
	/**
	 * Creates a new SparqlConnection object with a unique ID.
	 * @param label A user-friendly name for the connection.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @param scope Where the connection will be saved ('project' or 'user').
	 * @returns A new SparqlConnection object.
	 */
	public create(label: string, endpointUrl: string, scope: SparqlConnectionScope = 'user'): SparqlConnection {
		return {
			id: uuidv4(),
			label,
			endpointUrl,
			scope,
		};
	}
}