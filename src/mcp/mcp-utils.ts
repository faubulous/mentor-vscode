import { Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Literal } from '@rdfjs/types';
import { getConfig } from '@src/utilities/vscode/config';
import { IDocumentContextService } from '@src/services/document';
import { SparqlConnectionService } from '@src/languages/sparql/services/sparql-connection-service';
import { SparqlQueryService } from '@src/languages/sparql/services/sparql-query-service';
import { PrefixLookupService } from '@src/services/document/prefix-lookup-service';
import { WorkspaceIndexerService } from '@src/services/core/workspace-indexer-service';
import { NamespaceMap } from '@src/utilities';

export interface MentorMcpServices {
	store: Store;
	vocabulary: VocabularyRepository;
	connectionService: SparqlConnectionService;
	queryService: SparqlQueryService;
	prefixService: PrefixLookupService;
	contextService: IDocumentContextService;
	indexerService: WorkspaceIndexerService;
}

export function waitForReady(services: MentorMcpServices): Promise<void> {
	return services.indexerService.waitForIndexed();
}

/**
 * Returns all graph URIs from the workspace store, including inference graphs,
 * since inferred triples are valid domain knowledge.
 */
export function getWorkspaceGraphUris(store: Store): string[] {
	return store.getGraphs();
}

/**
 * Retrieves all language-tagged annotation values for a resource using the
 * configured predicate priority list (mentor.predicates.label or .description).
 * Returns values from the first predicate that yields any results.
 */
export function getAnnotations(
	store: Store,
	graphUris: string[],
	iri: string,
	configKey: 'predicates.label' | 'predicates.description'
): Array<{ value: string; language: string }> {
	const predicates = getConfig().get<string[]>(configKey, []);

	for (const predIri of predicates) {
		const results: Array<{ value: string; language: string }> = [];

		for (const quad of store.matchAll(graphUris, { termType: 'NamedNode', value: iri } as any, { termType: 'NamedNode', value: predIri } as any, null, true)) {
			if (quad.object.termType === 'Literal' && quad.object.value.length > 0) {
				results.push({
					value: quad.object.value,
					language: (quad.object as Literal).language ?? ''
				});
			}
		}

		if (results.length > 0) return results;
	}

	return [];
}

/**
 * Serializes Comunica Bindings objects to plain JSON-serializable rows,
 * capped at the given limit. Returns columns, rows, and a truncated flag.
 * Accepts any[] because executeQueryOnConnection returns bindings typed as any[].
 */
export function serializeBindings(bindings: any[], limit: number): {
	columns: string[];
	rows: Record<string, { termType: string; value: string }>[];
	truncated: boolean;
} {
	const truncated = bindings.length > limit;
	const capped = bindings.slice(0, limit);
	const columnSet = new Set<string>();

	const rows = capped.map(b => {
		const row: Record<string, { termType: string; value: string }> = {};

		for (const [k, v] of b) {
			const key = k.value as string;
			columnSet.add(key);
			row[key] = { termType: v.termType, value: v.value };
		}

		return row;
	});

	return { columns: [...columnSet], rows, truncated };
}

/**
 * Aggregates workspace namespace prefix maps from all loaded document contexts,
 * merged with W3C defaults and configured project prefixes.
 */
export function getWorkspacePrefixes(
	prefixService: PrefixLookupService,
	contextService: IDocumentContextService
): NamespaceMap {
	const prefixes: NamespaceMap = { ...prefixService.getDefaultPrefixes() };

	for (const ctx of Object.values(contextService.contexts)) {
		if (ctx.namespaces) {
			for (const [prefix, iri] of Object.entries(ctx.namespaces)) {
				if (prefix && iri) {
					prefixes[prefix] = iri;
				}
			}
		}
	}

	return prefixes;
}

export interface TermSnapshot {
	termType: string;
	value: string;
	datatype?: string;
	language?: string;
	labels?: Array<{ value: string; language: string }>;
}

/**
 * Converts an RDF term to a plain JSON-serializable snapshot.
 * When store and graphUris are provided and the term is a NamedNode,
 * labels are fetched and included so agents can identify the resource.
 */
export function snapshotTerm(term: any, store?: Store, graphUris?: string[]): TermSnapshot {
	const t: TermSnapshot = { termType: term.termType, value: term.value };
	if (term.datatype?.value) t.datatype = term.datatype.value;
	if (term.language) t.language = term.language;
	if (store && graphUris && term.termType === 'NamedNode') {
		const labels = getAnnotations(store, graphUris, term.value, 'predicates.label');
		if (labels.length > 0) t.labels = labels;
	}
	return t;
}

export interface ClassPropertyData {
	instanceCount: number;
	graphs: string[];
	properties: object[];
}

/**
 * Fetches all properties used on instances of a class (depth 1 or 2) via SPARQL,
 * along with instance count and named graph membership.
 * Shared by get-class-properties and get-query-context tools.
 */
export async function fetchClassProperties(
	classIri: string,
	depth: number,
	limit: number,
	store: Store,
	graphUris: string[],
	conn: any,
	queryService: SparqlQueryService,
	inferenceUri: { isInferenceUri(uri: string): boolean }
): Promise<ClassPropertyData> {
	const classNode = { termType: 'NamedNode', value: classIri } as any;
	const rdfTypePred = { termType: 'NamedNode', value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' } as any;

	// Graph membership — synchronous in-memory scan
	const graphSet = new Set<string>();
	for (const quad of store.matchAll(graphUris, null, rdfTypePred, classNode, true)) {
		if (quad.graph.termType === 'NamedNode' && !inferenceUri.isInferenceUri(quad.graph.value)) {
			graphSet.add(quad.graph.value);
		}
	}

	const [rawCount, raw1] = await Promise.all([
		queryService.executeQueryOnConnection(
			`SELECT (COUNT(DISTINCT ?s) AS ?count) WHERE { ?s a <${classIri}> . }`,
			conn
		),
		queryService.executeQueryOnConnection(
			`SELECT DISTINCT ?p (SAMPLE(?o) AS ?example) (COUNT(DISTINCT ?s) AS ?count)` +
			` WHERE { ?s a <${classIri}> . ?s ?p ?o . }` +
			` GROUP BY ?p ORDER BY DESC(?count) LIMIT ${limit}`,
			conn
		)
	]);

	let instanceCount = 0;
	if (rawCount?.type === 'bindings') {
		for (const b of rawCount.bindings) {
			for (const [k, v] of b) {
				if (k.value === 'count') instanceCount = Number(v.value);
			}
		}
	}

	if (!raw1 || raw1.type !== 'bindings') {
		return { instanceCount, graphs: [...graphSet], properties: [] };
	}

	interface Depth1Prop { iri: string; count: number; example: any }
	const depth1Props: Depth1Prop[] = [];
	for (const b of raw1.bindings) {
		let iri = ''; let count = 0; let example: any = null;
		for (const [k, v] of b) {
			if (k.value === 'p') iri = v.value;
			else if (k.value === 'count') count = Number(v.value);
			else if (k.value === 'example') example = v;
		}
		if (iri) depth1Props.push({ iri, count, example });
	}

	const depth2Map = new Map<string, { rangeTypes: string[]; nested: object[] }>();

	if (depth >= 2) {
		const objectProps = depth1Props.filter(
			p => p.example && (p.example.termType === 'NamedNode' || p.example.termType === 'BlankNode')
		);

		await Promise.all(objectProps.map(async p => {
			const [rawNested, rawTypes] = await Promise.all([
				queryService.executeQueryOnConnection(
					`SELECT DISTINCT ?p2 (SAMPLE(?o2) AS ?example2) (COUNT(DISTINCT ?o) AS ?count2)` +
					` WHERE { ?s a <${classIri}> . ?s <${p.iri}> ?o . ?o ?p2 ?o2 . }` +
					` GROUP BY ?p2 ORDER BY DESC(?count2) LIMIT ${limit}`,
					conn
				),
				queryService.executeQueryOnConnection(
					`SELECT DISTINCT ?type WHERE { ?s a <${classIri}> . ?s <${p.iri}> ?o . ?o a ?type . } LIMIT 10`,
					conn
				)
			]);

			const rangeTypes: string[] = [];
			if (rawTypes?.type === 'bindings') {
				for (const b of rawTypes.bindings) {
					for (const [k, v] of b) {
						if (k.value === 'type') rangeTypes.push(v.value);
					}
				}
			}

			const nested: object[] = [];
			if (rawNested?.type === 'bindings') {
				for (const b of rawNested.bindings) {
					let pIri = ''; let cnt = 0; let ex: any = null;
					for (const [k, v] of b) {
						if (k.value === 'p2') pIri = v.value;
						else if (k.value === 'count2') cnt = Number(v.value);
						else if (k.value === 'example2') ex = v;
					}
					if (pIri) {
						nested.push({
							iri: pIri,
							labels: getAnnotations(store, graphUris, pIri, 'predicates.label'),
							count: cnt,
							example: ex ? snapshotTerm(ex, store, graphUris) : null
						});
					}
				}
			}

			depth2Map.set(p.iri, { rangeTypes, nested });
		}));
	}

	const properties = depth1Props.map(p => {
		const prop: Record<string, any> = {
			iri: p.iri,
			labels: getAnnotations(store, graphUris, p.iri, 'predicates.label'),
			count: p.count,
			example: p.example ? snapshotTerm(p.example, store, graphUris) : null
		};
		const d2 = depth2Map.get(p.iri);
		if (d2?.rangeTypes.length) prop.rangeTypes = d2.rangeTypes;
		if (d2?.nested.length) prop.nestedProperties = d2.nested;
		return prop;
	});

	return { instanceCount, graphs: [...graphSet], properties };
}
