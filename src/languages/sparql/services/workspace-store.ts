import { ConfigurationScope } from '@src/utilities/config-scope';
import { SparqlConnection } from './sparql-connection';
import { TripleStoreConfig } from './triple-store-config';

/**
 * The non-removable workspace triple store connection.
 */
export const WORKSPACE_CONNECTION: SparqlConnection = {
	id: 'workspace',
	label: 'Workspace',
	endpointUrl: 'workspace:',
	description: 'In-memory triple store of the workspace.',
	configScope: ConfigurationScope.Workspace,
	isProtected: true,
	storeType: 'workspace',
	canToggleInference: true
};

/**
 * The non-removable workspace triple store config, derived from {@link WORKSPACE_CONNECTION}.
 */
export const WORKSPACE_STORE: TripleStoreConfig = {
	id: WORKSPACE_CONNECTION.id,
	label: WORKSPACE_CONNECTION.label!,
	description: WORKSPACE_CONNECTION.description,
	isProtected: WORKSPACE_CONNECTION.isProtected,
	inference: {
		supported: true
	}
};
