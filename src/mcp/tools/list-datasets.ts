import * as vscode from 'vscode';
import { Literal } from '@rdfjs/types';
import { MentorMcpServices, getWorkspaceGraphUris, getAnnotations, waitForReady } from '../mcp-utils';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const DCAT_DATASET = 'http://www.w3.org/ns/dcat#Dataset';
const DCAT_DISTRIBUTION = 'http://www.w3.org/ns/dcat#distribution';
const DCAT_KEYWORD = 'http://www.w3.org/ns/dcat#keyword';
const DCAT_THEME = 'http://www.w3.org/ns/dcat#theme';
const DCT_PUBLISHER = 'http://purl.org/dc/terms/publisher';
const DCT_LICENSE = 'http://purl.org/dc/terms/license';
const DCT_CREATED = 'http://purl.org/dc/terms/created';
const DCT_ISSUED = 'http://purl.org/dc/terms/issued';
const DCT_MODIFIED = 'http://purl.org/dc/terms/modified';

interface ListDatasetsInput {
	limit?: number;
}

export class ListDatasetsTool implements vscode.LanguageModelTool<ListDatasetsInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ListDatasetsInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { store } = this.services;
		const limit = options.input.limit ?? 200;
		const graphUris = getWorkspaceGraphUris(store);

		console.log('[mentor-mcp] list-datasets');
		const t0 = performance.now();

		const rdfType = { termType: 'NamedNode', value: RDF_TYPE } as any;
		const dcatDataset = { termType: 'NamedNode', value: DCAT_DATASET } as any;

		const datasetGraphs = new Map<string, Set<string>>();
		for (const quad of store.matchAll(graphUris, null, rdfType, dcatDataset, true)) {
			if (quad.subject.termType === 'NamedNode') {
				const iri = quad.subject.value;
				if (!datasetGraphs.has(iri)) datasetGraphs.set(iri, new Set());
				if (quad.graph.termType === 'NamedNode') datasetGraphs.get(iri)!.add(quad.graph.value);
			}
		}

		const node = (iri: string) => ({ termType: 'NamedNode', value: iri } as any);
		const pred = (iri: string) => ({ termType: 'NamedNode', value: iri } as any);

		const getIriValues = (subjectIri: string, predicateIri: string): string[] =>
			[...store.matchAll(graphUris, node(subjectIri), pred(predicateIri), null, true)]
				.filter(q => q.object.termType === 'NamedNode')
				.map(q => q.object.value);

		const datasets = [...datasetGraphs.keys()].slice(0, limit).map(iri => {
			const keywords = [...store.matchAll(graphUris, node(iri), pred(DCAT_KEYWORD), null, true)]
				.filter(q => q.object.termType === 'Literal')
				.map(q => ({ value: q.object.value, language: (q.object as Literal).language ?? '' }));

			const distributions = getIriValues(iri, DCAT_DISTRIBUTION);
			const themes = getIriValues(iri, DCAT_THEME);
			const publishers = getIriValues(iri, DCT_PUBLISHER);
			const licenses = getIriValues(iri, DCT_LICENSE);
			const getLiteralValue = (predicateIri: string) =>
				[...store.matchAll(graphUris, node(iri), pred(predicateIri), null, true)]
					.map(q => q.object.value)[0];
			const created = getLiteralValue(DCT_CREATED);
			const issued = getLiteralValue(DCT_ISSUED);
			const modified = getLiteralValue(DCT_MODIFIED);

			const graphs = [...(datasetGraphs.get(iri) ?? [])];

			const result: Record<string, any> = {
				iri,
				graphs,
				labels: getAnnotations(store, graphUris, iri, 'predicates.label'),
				descriptions: getAnnotations(store, graphUris, iri, 'predicates.description'),
			};
			if (distributions.length > 0) result.distributions = distributions;
			if (keywords.length > 0) result.keywords = keywords;
			if (themes.length > 0) result.themes = themes;
			if (publishers.length > 0) result.publishers = publishers;
			if (licenses.length > 0) result.licenses = licenses;
			if (created) result.created = created;
			if (issued) result.issued = issued;
			if (modified) result.modified = modified;

			return result;
		});

		console.log(`[mentor-mcp] list-datasets: ${(performance.now() - t0).toFixed(1)}ms`);
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ count: datasets.length, datasets }))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<ListDatasetsInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Listing DCAT datasets in workspace store' };
	}
}
