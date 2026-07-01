import { SparqlStoreConfig } from './sparql-store-config';

/**
 * The built-in store types seeded into the user's `mentor.sparql.stores` setting on first run
 * (see `SeedDefaultStoresMigration`). Unlike the generic `sparql` store — which ships as the
 * package.json `default` and is therefore always present and protected — these are seeded as
 * ordinary, editable user stores so their query templates can be tested/adjusted and reasoning
 * support configured per deployment.
 */
export const DEFAULT_SEED_STORES: SparqlStoreConfig[] = [
	{
		id: 'jena',
		label: 'Apache Jena Fuseki',
		website: 'https://jena.apache.org/',
		queries: {
			listGraphs: 'SELECT DISTINCT ?graph\nWHERE \n{\n    GRAPH ?graph {}\n}\nORDER BY ?graph'
		}
	},
	{
		id: 'rdf4j',
		label: 'RDF4J',
		website: 'https://rdf4j.org/',
		inference: {
			supported: true,
			urlParameters: {
				enabled: 'infer=true',
				disabled: 'infer=false'
			}
		}
	},
	{
		id: 'qlever',
		label: 'QLever',
		website: 'https://github.com/ad-freiburg/qlever'
	}
];
