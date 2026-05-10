import * as vscode from 'vscode';
import { InferenceUri } from '@src/providers/inference-uri';
import { MentorMcpServices, getWorkspaceGraphUris, getAnnotations, waitForReady, fetchClassProperties } from '../mcp-utils';

interface GetClassPropertiesInput {
	classIri: string;
	depth?: number;
	limit?: number;
}

export class GetClassPropertiesTool implements vscode.LanguageModelTool<GetClassPropertiesInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<GetClassPropertiesInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { classIri, depth = 1, limit = 50 } = options.input;
		const { store, queryService, connectionService } = this.services;
		const graphUris = getWorkspaceGraphUris(store);
		const conn = { ...connectionService.getConnections()[0], inferenceEnabled: true };

		console.log(`[mentor-mcp] get-class-properties: <${classIri}> depth=${depth}`);
		const t0 = performance.now();

		const classLabels = getAnnotations(store, graphUris, classIri, 'predicates.label');
		const { instanceCount, graphs, properties } = await fetchClassProperties(
			classIri, depth, limit, store, graphUris, conn, queryService, InferenceUri
		);

		console.log(`[mentor-mcp] get-class-properties: ${(performance.now() - t0).toFixed(1)}ms`);
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ classIri, classLabels, instanceCount, graphs, properties }))
		]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<GetClassPropertiesInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: `Inspecting properties used on instances of <${options.input.classIri}>` };
	}
}
