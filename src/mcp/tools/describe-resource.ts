import * as vscode from 'vscode';
import { MentorMcpServices, waitForReady } from '../mcp-utils';

interface DescribeResourceInput {
	resourceIri: string;
}

export class DescribeResourceTool implements vscode.LanguageModelTool<DescribeResourceInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<DescribeResourceInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { resourceIri } = options.input;
		const workspaceConnection = { ...this.services.connectionService.getConnections()[0], inferenceEnabled: true };
		const query = `DESCRIBE <${resourceIri}>`;

		console.log(`[mentor-mcp] describe-resource: ${resourceIri}`);
		const t0 = performance.now();
		const raw = await this.services.queryService.executeQueryOnConnection(query, workspaceConnection);
		console.log(`[mentor-mcp] describe-resource: ${(performance.now() - t0).toFixed(1)}ms`);

		let result: object;

		if (!raw || raw.type !== 'quads') {
			result = { type: 'quads', mimeType: 'text/turtle', data: '' };
		} else {
			result = { type: 'quads', mimeType: 'text/turtle', data: raw.data };
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(result))
		]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<DescribeResourceInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: `Describing resource <${options.input.resourceIri}>` };
	}
}
