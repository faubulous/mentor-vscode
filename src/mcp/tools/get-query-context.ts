import * as vscode from 'vscode';
import { OWL, RDFS, RDF, SKOS, Uri } from '@faubulous/mentor-rdf';
import { Literal } from '@rdfjs/types';
import { getConfig } from '@src/utilities/vscode/config';
import { InferenceUri } from '@src/providers/inference-uri';
import {
	MentorMcpServices, getWorkspaceGraphUris, getAnnotations,
	getWorkspacePrefixes, waitForReady, fetchClassProperties
} from '../mcp-utils';

interface GetQueryContextInput {
	terms: string[];
	language?: string;
	depth?: number;
	limit?: number;
}

type MatchType = 'class' | 'property' | 'concept' | 'instance';

interface MatchedResource {
	iri: string;
	matchType: MatchType;
	labels: Array<{ value: string; language: string }>;
	types?: string[];
	graphs: string[];
	instanceCount?: number;
	properties?: object[];
}

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

export class GetQueryContextTool implements vscode.LanguageModelTool<GetQueryContextInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<GetQueryContextInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { terms, language, depth = 2, limit = 10 } = options.input;
		const { store, queryService, connectionService, prefixService, contextService } = this.services;
		const graphUris = getWorkspaceGraphUris(store);
		const conn = { ...connectionService.getConnections()[0], inferenceEnabled: true };

		console.log(`[mentor-mcp] get-query-context: ${JSON.stringify(terms)}`);
		const t0 = performance.now();

		const labelPredicates = getConfig().get<string[]>('predicates.label', []);
		const rdfType = { termType: 'NamedNode', value: RDF_TYPE } as any;

		// Phase 1: In-memory label search for all terms simultaneously
		// Map<iri, { labelObjects, types, matchedTerms }>
		interface ResourceEntry {
			labelKeys: Set<string>;
			labelObjects: Array<{ value: string; language: string }>;
			types: Set<string>;
			matchedTerms: Set<string>;
		}
		const resourceMap = new Map<string, ResourceEntry>();

		for (const term of terms) {
			const searchLower = term.toLowerCase();

			for (const predIri of labelPredicates) {
				const pred = { termType: 'NamedNode', value: predIri } as any;

				for (const quad of store.matchAll(graphUris, null, pred, null, true)) {
					if (quad.object.termType !== 'Literal') continue;
					if (quad.subject.termType !== 'NamedNode') continue;
					if (!quad.object.value.toLowerCase().includes(searchLower)) continue;
					if (language && (quad.object as Literal).language !== language) continue;

					const iri = quad.subject.value;

					if (!resourceMap.has(iri)) {
						const types = new Set<string>();
						for (const tq of store.matchAll(graphUris, quad.subject, rdfType, null, true)) {
							if (tq.object.termType === 'NamedNode') types.add(tq.object.value);
						}
						resourceMap.set(iri, { labelKeys: new Set(), labelObjects: [], types, matchedTerms: new Set() });
					}

					const entry = resourceMap.get(iri)!;
					const labelKey = `${quad.object.value}|${(quad.object as Literal).language ?? ''}`;
					if (!entry.labelKeys.has(labelKey)) {
						entry.labelKeys.add(labelKey);
						entry.labelObjects.push({ value: quad.object.value, language: (quad.object as Literal).language ?? '' });
					}
					entry.matchedTerms.add(term);
				}
			}
		}

		// Phase 2: Classify and collect graph membership
		const classifyTypes = (types: Set<string>): MatchType => {
			if (types.has(OWL.Class) || types.has(RDFS.Class)) return 'class';
			if (types.has(OWL.ObjectProperty) || types.has(OWL.DatatypeProperty) ||
				types.has(OWL.AnnotationProperty) || types.has(RDF.Property)) return 'property';
			if (types.has(SKOS.Concept)) return 'concept';
			return 'instance';
		};

		const getAssertedGraphs = (iri: string): string[] => {
			const subjectNode = { termType: 'NamedNode', value: iri } as any;
			const graphs = new Set<string>();
			for (const quad of store.matchAll(graphUris, subjectNode, null, null, false)) {
				if (quad.graph.termType === 'NamedNode' && !InferenceUri.isInferenceUri(quad.graph.value)) {
					graphs.add(quad.graph.value);
				}
			}
			return [...graphs];
		};

		// Build per-term resource arrays, capped at limit
		const termResourceMap = new Map<string, MatchedResource[]>();
		for (const term of terms) termResourceMap.set(term, []);

		// Track class IRIs so we can fetch property chains for all at once
		const classIris = new Set<string>();

		for (const [iri, entry] of resourceMap) {
			const matchType = classifyTypes(entry.types);
			const graphs = getAssertedGraphs(iri);

			const resource: MatchedResource = {
				iri,
				matchType,
				labels: entry.labelObjects,
				graphs
			};
			if (entry.types.size > 0) resource.types = [...entry.types];
			if (matchType === 'class') classIris.add(iri);

			for (const term of entry.matchedTerms) {
				const arr = termResourceMap.get(term)!;
				if (arr.length < limit) arr.push(resource);
			}
		}

		// Phase 3: Fetch property chains for all matched classes in parallel
		const classDataMap = new Map<string, { instanceCount: number; graphs: string[]; properties: object[] }>();

		await Promise.all([...classIris].map(async classIri => {
			const data = await fetchClassProperties(
				classIri, depth, 50, store, graphUris, conn, queryService, InferenceUri
			);
			classDataMap.set(classIri, data);
		}));

		// Attach class data to resources
		for (const resources of termResourceMap.values()) {
			for (const res of resources) {
				if (res.matchType === 'class') {
					const data = classDataMap.get(res.iri);
					if (data) {
						res.instanceCount = data.instanceCount;
						// Merge graphs from property chain scan (may include more graphs than label search)
						const graphSet = new Set([...res.graphs, ...data.graphs]);
						res.graphs = [...graphSet];
						res.properties = data.properties;
					}
				}
			}
		}

		// Phase 4: Extract focused prefix map — only namespaces used in the response
		const allIris = new Set<string>();
		const collectIris = (resources: MatchedResource[]) => {
			for (const res of resources) {
				allIris.add(res.iri);
				res.types?.forEach(t => allIris.add(t));
				collectPropertyIris(res.properties ?? [], allIris);
			}
		};
		for (const resources of termResourceMap.values()) collectIris(resources);

		const workspacePrefixes = getWorkspacePrefixes(prefixService, contextService);
		// Reverse: namespace IRI → shortest prefix
		const namespaceToPrefix = new Map<string, string>();
		for (const [pfx, ns] of Object.entries(workspacePrefixes)) {
			const existing = namespaceToPrefix.get(ns);
			if (!existing || pfx.length < existing.length) namespaceToPrefix.set(ns, pfx);
		}

		const focusedPrefixes: Record<string, string> = {};
		for (const iri of allIris) {
			const ns = Uri.getNamespaceIri(iri);
			if (ns && ns !== iri) {
				const pfx = namespaceToPrefix.get(ns);
				if (pfx && !focusedPrefixes[pfx]) focusedPrefixes[pfx] = ns;
			}
		}

		const matches = terms
			.map(term => ({ term, resources: termResourceMap.get(term) ?? [] }))
			.filter(m => m.resources.length > 0);

		console.log(`[mentor-mcp] get-query-context: ${(performance.now() - t0).toFixed(1)}ms`);
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ matches, prefixes: focusedPrefixes }))
		]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<GetQueryContextInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: `Looking up query context for: ${options.input.terms.join(', ')}` };
	}
}

function collectPropertyIris(properties: object[], out: Set<string>): void {
	for (const prop of properties as any[]) {
		if (prop.iri) out.add(prop.iri);
		if (prop.rangeTypes) (prop.rangeTypes as string[]).forEach(t => out.add(t));
		if (prop.example?.termType === 'NamedNode' && prop.example.value) out.add(prop.example.value);
		if (prop.nestedProperties) collectPropertyIris(prop.nestedProperties, out);
	}
}
