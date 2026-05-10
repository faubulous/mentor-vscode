import * as vscode from 'vscode';
import { MentorMcpServices, serializeBindings, waitForReady } from '../mcp-utils';

interface ExecuteSparqlInput {
	query: string;
	limit?: number;
}

export class ExecuteSparqlTool implements vscode.LanguageModelTool<ExecuteSparqlInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ExecuteSparqlInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { query, limit = 200 } = options.input;
		const workspaceConnection = { ...this.services.connectionService.getConnections()[0], inferenceEnabled: true };

		console.log(`[mentor-mcp] execute-sparql:\n${query}`);
		const t0 = performance.now();
		const raw = await this.services.queryService.executeQueryOnConnection(query, workspaceConnection);
		console.log(`[mentor-mcp] execute-sparql: ${(performance.now() - t0).toFixed(1)}ms`);

		let result: object;

		if (!raw) {
			result = { type: 'none' };
		} else if (raw.type === 'boolean') {
			result = { type: 'boolean', value: raw.value };
		} else if (raw.type === 'quads') {
			result = { type: 'quads', mimeType: 'text/turtle', data: raw.data };
		} else {
			result = { type: 'bindings', ...serializeBindings(raw.bindings, limit) };
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(result))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<ExecuteSparqlInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Executing SPARQL query against workspace store' };
	}
}
