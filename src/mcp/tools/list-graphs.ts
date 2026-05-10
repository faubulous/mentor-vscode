import * as vscode from 'vscode';
import { InferenceUri } from '@src/providers/inference-uri';
import { MentorMcpServices, getWorkspaceGraphUris, waitForReady } from '../mcp-utils';

export class ListGraphsTool implements vscode.LanguageModelTool<Record<string, never>> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const all = getWorkspaceGraphUris(this.services.store);
		const asserted = all.filter(g => !InferenceUri.isInferenceUri(g));
		const inferred = all.filter(g => InferenceUri.isInferenceUri(g));

		const result = { asserted, inferred };
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(result))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Listing RDF graphs in workspace store' };
	}
}
