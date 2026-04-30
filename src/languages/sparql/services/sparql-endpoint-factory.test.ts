import { describe, it, expect, beforeEach } from 'vitest';
import { SparqlEndpointFactory } from '@src/languages/sparql/services/sparql-endpoint-factory';
import { ISparqlEndpointProvider } from '@src/languages/sparql/services/sparql-endpoint-provider.interface';
import { SparqlConnection, SparqlStoreType } from '@src/languages/sparql/services/sparql-connection';
import { ComunicaEndpoint } from '@src/languages/sparql/services/sparql-endpoint';

function createMockProvider(storeType: SparqlStoreType, supportsInference: boolean = false): ISparqlEndpointProvider {
	return {
		storeType,
		supportsInference,
		createEndpoint: async (connection: SparqlConnection): Promise<ComunicaEndpoint> => ({
			type: 'sparql',
			value: connection.endpointUrl,
			connection,
		}),
		getGraphs: async (): Promise<string[]> => ['http://example.org/graph1', 'http://example.org/graph2'],
	};
}

const baseConnection: SparqlConnection = {
	id: 'test-id',
	endpointUrl: 'https://example.org/sparql',
	configScope: 2,
	storeType: 'sparql',
};

describe('SparqlEndpointFactory', () => {
	let factory: SparqlEndpointFactory;

	beforeEach(() => {
		factory = new SparqlEndpointFactory();
	});

	describe('registerProvider / getProvider', () => {
		it('returns undefined for an unregistered store type', () => {
			expect(factory.getProvider('sparql')).toBeUndefined();
		});

		it('returns the registered provider', () => {
			const provider = createMockProvider('sparql');

			factory.registerProvider(provider);

			expect(factory.getProvider('sparql')).toBe(provider);
		});

		it('registers multiple providers independently', () => {
			const sparqlProvider = createMockProvider('sparql');
			const graphdbProvider = createMockProvider('graphdb');

			factory.registerProvider(sparqlProvider);
			factory.registerProvider(graphdbProvider);

			expect(factory.getProvider('sparql')).toBe(sparqlProvider);
			expect(factory.getProvider('graphdb')).toBe(graphdbProvider);
		});

		it('overrides an existing provider for the same store type', () => {
			const first = createMockProvider('sparql');
			const second = createMockProvider('sparql', true);

			factory.registerProvider(first);
			factory.registerProvider(second);

			expect(factory.getProvider('sparql')).toBe(second);
		});
	});

	describe('supportsInference', () => {
		it('returns false when no provider is registered', () => {
			expect(factory.supportsInference('sparql')).toBe(false);
		});

		it('returns false when provider does not support inference', () => {
			factory.registerProvider(createMockProvider('sparql', false));
			expect(factory.supportsInference('sparql')).toBe(false);
		});

		it('returns true when provider supports inference', () => {
			factory.registerProvider(createMockProvider('graphdb', true));
			expect(factory.supportsInference('graphdb')).toBe(true);
		});
	});

	describe('setDefaultProvider', () => {
		it('uses the default provider when no specific provider matches', async () => {
			const defaultProvider = createMockProvider('sparql');

			factory.setDefaultProvider(defaultProvider);

			const connection: SparqlConnection = { ...baseConnection, storeType: 'workspace' };
			const result = await factory.createQuerySource(connection, false);

			expect(result).toBeDefined();
		});
	});

	describe('createQuerySource', () => {
		it('throws when no provider and no default provider', async () => {
			await expect(factory.createQuerySource(baseConnection, false))
				.rejects.toThrow('No query source provider registered for store type: sparql');
		});

		it('creates a query source with a registered provider', async () => {
			factory.registerProvider(createMockProvider('sparql'));

			const result = await factory.createQuerySource(baseConnection, false);

			expect(result).toBeDefined();
			expect((result as any).value).toBe('https://example.org/sparql');
		});

		it('defaults to sparql store type when storeType is not set', async () => {
			factory.registerProvider(createMockProvider('sparql'));

			const connection: SparqlConnection = { id: 'x', endpointUrl: 'https://example.org/sparql', configScope: 2 };
			const result = await factory.createQuerySource(connection, false);

			expect(result).toBeDefined();
		});

		it('passes inferenceEnabled to the provider', async () => {
			let capturedEnabled: boolean | undefined;

			const provider: ISparqlEndpointProvider = {
				storeType: 'sparql',
				supportsInference: true,
				createEndpoint: async (_conn, opts) => {
					capturedEnabled = opts.inferenceEnabled;
					return { type: 'sparql', value: 'x', connection: _conn };
				},
				getGraphs: async () => [],
			};

			factory.registerProvider(provider);

			await factory.createQuerySource(baseConnection, true);

			expect(capturedEnabled).toBe(true);
		});
	});

	describe('getGraphs', () => {
		it('throws when no provider is registered', async () => {
			const connection: SparqlConnection = { ...baseConnection, storeType: 'graphdb' };

			await expect(factory.getGraphs(connection, false))
				.rejects.toThrow('No query source provider registered for store type: graphdb');
		});

		it('returns graphs from the registered provider', async () => {
			factory.registerProvider(createMockProvider('sparql'));

			const result = await factory.getGraphs(baseConnection, false);

			expect(result).toEqual(['http://example.org/graph1', 'http://example.org/graph2']);
		});

		it('uses default provider when no specific provider matches', async () => {
			factory.setDefaultProvider(createMockProvider('sparql'));

			const connection: SparqlConnection = { ...baseConnection, storeType: 'workspace' };
			const result = await factory.getGraphs(connection, false);
			
			expect(result).toEqual(['http://example.org/graph1', 'http://example.org/graph2']);
		});

		it('defaults to sparql store type when storeType is not set (line 76 ?? fallback)', async () => {
			factory.registerProvider(createMockProvider('sparql'));

			const connection: SparqlConnection = { id: 'x', endpointUrl: 'https://example.org/sparql', configScope: 2 };
			const result = await factory.getGraphs(connection, false);

			expect(result).toEqual(['http://example.org/graph1', 'http://example.org/graph2']);
		});
	});
});
