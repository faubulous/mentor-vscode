import * as vscode from 'vscode';
import { MentorMcpServices, getWorkspacePrefixes, waitForReady } from '../mcp-utils';

export class GetPrefixesTool implements vscode.LanguageModelTool<Record<string, never>> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const prefixes = getWorkspacePrefixes(this.services.prefixService, this.services.contextService);
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ prefixes }))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Retrieving namespace prefixes from workspace' };
	}
}
