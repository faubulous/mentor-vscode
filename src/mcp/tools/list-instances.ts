import * as vscode from 'vscode';
import { MentorMcpServices, getWorkspaceGraphUris, getAnnotations, waitForReady } from '../mcp-utils';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

interface ListInstancesInput {
	classIri: string;
	limit?: number;
}

export class ListInstancesTool implements vscode.LanguageModelTool<ListInstancesInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ListInstancesInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { classIri, limit = 200 } = options.input;
		const { store } = this.services;
		const graphUris = getWorkspaceGraphUris(store);

		console.log(`[mentor-mcp] list-instances: <${classIri}>`);
		const t0 = performance.now();

		const rdfType = { termType: 'NamedNode', value: RDF_TYPE } as any;
		const classNode = { termType: 'NamedNode', value: classIri } as any;
		const classLabels = getAnnotations(store, graphUris, classIri, 'predicates.label');

		const instanceIris = new Set<string>();
		for (const quad of store.matchAll(graphUris, null, rdfType, classNode, true)) {
			if (quad.subject.termType === 'NamedNode') {
				instanceIris.add(quad.subject.value);
			}
		}

		const instances = [...instanceIris].slice(0, limit).map(iri => ({
			iri,
			labels: getAnnotations(store, graphUris, iri, 'predicates.label')
		}));

		console.log(`[mentor-mcp] list-instances: ${(performance.now() - t0).toFixed(1)}ms`);
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({
				classIri,
				classLabels,
				count: instanceIris.size,
				truncated: instanceIris.size > limit,
				instances
			}))
		]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<ListInstancesInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: `Listing instances of <${options.input.classIri}>` };
	}
}
