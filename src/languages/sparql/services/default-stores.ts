import { TripleStoreConfig } from './triple-store-config';

/**
 * The vendor-neutral store types that ship with Mentor itself, shown in the "Built-In"
 * group of the Stores settings section alongside the synthetic workspace store.
 */
export const BUILT_IN_STORES: TripleStoreConfig[] = [
	{
		id: 'sparql',
		label: 'SPARQL Endpoint',
		description: 'A generic endpoint conforming to the SPARQL 1.1 Protocol.',
		documentationUrl: 'https://www.w3.org/TR/sparql11-query/',
		isProtected: true
	}
];

/**
 * Store types for Open Source triple stores maintained by independent developer
 * communities. Mentor ships these configurations for convenience only; it is not
 * affiliated with the projects. Shown in the "Community" group of the Stores settings
 * section.
 */
export const COMMUNITY_STORES: TripleStoreConfig[] = [
	{
		id: 'jena',
		label: 'Apache Jena Fuseki',
		description: 'SPARQL server of the Apache Jena framework.',
		documentationUrl: 'https://jena.apache.org/',
		isProtected: true,
		queries: {
			listGraphs: 'SELECT DISTINCT ?graph\nWHERE \n{\n    GRAPH ?graph {}\n}\nORDER BY ?graph'
		}
	},
	{
		id: 'qlever',
		label: 'QLever',
		description: 'High-performance SPARQL engine for very large knowledge graphs.',
		documentationUrl: 'https://github.com/ad-freiburg/qlever',
		isProtected: true
	},
	{
		id: 'rdf4j',
		label: 'RDF4J',
		description: 'Eclipse RDF4J server with per-query reasoning control.',
		documentationUrl: 'https://rdf4j.org/',
		isProtected: true,
		inference: {
			supported: true,
			urlParameters: {
				enabled: 'infer=true',
				disabled: 'infer=false'
			}
		}
	}
];

/**
 * The built-in store type presets. They are defined in code, always present, cannot be
 * edited or deleted, and are never written to the `mentor.sparql.stores` setting — that
 * setting only holds user- and workspace-defined stores. Settings entries whose id
 * collides with a preset are ignored (see `TripleStoreConfigService.getStoreConfigs`).
 *
 * This module must stay importable from the webview bundle: no `vscode` imports.
 */
export const PRESET_STORES: TripleStoreConfig[] = [...BUILT_IN_STORES, ...COMMUNITY_STORES];
