import * as vscode from 'vscode';
import { Literal } from '@rdfjs/types';
import { getConfig } from '@src/utilities/vscode/config';
import { MentorMcpServices, getWorkspaceGraphUris, waitForReady } from '../mcp-utils';

interface SearchByLabelInput {
	labelText: string;
	language?: string;
}

export class SearchByLabelTool implements vscode.LanguageModelTool<SearchByLabelInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<SearchByLabelInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { labelText, language } = options.input;
		const { store } = this.services;
		const graphUris = getWorkspaceGraphUris(store);
		const labelPredicates = getConfig().get<string[]>('predicates.label', []);
		const searchLower = labelText.toLowerCase();

		const results: Array<{ iri: string; label: string; language: string; predicate: string; types: string[] }> = [];
		const seen = new Set<string>();
		const rdfType = { termType: 'NamedNode', value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' } as any;

		for (const predIri of labelPredicates) {
			const pred = { termType: 'NamedNode', value: predIri } as any;

			for (const quad of store.matchAll(graphUris, null, pred, null, true)) {
				if (quad.object.termType !== 'Literal') continue;
				if (quad.subject.termType !== 'NamedNode') continue;

				const label = quad.object.value;
				const lang = (quad.object as Literal).language ?? '';

				if (!label.toLowerCase().includes(searchLower)) continue;
				if (language && lang !== language) continue;

				const key = `${quad.subject.value}|${label}|${lang}`;

				if (!seen.has(key)) {
					seen.add(key);
					const types = [...store.matchAll(graphUris, quad.subject, rdfType, null, true)]
						.filter(q => q.object.termType === 'NamedNode')
						.map(q => q.object.value);
					results.push({ iri: quad.subject.value, label, language: lang, predicate: predIri, types });
				}
			}
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ results }))
		]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<SearchByLabelInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: `Searching workspace store for "${options.input.labelText}"` };
	}
}
