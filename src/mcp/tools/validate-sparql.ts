import * as vscode from 'vscode';
import { SparqlLexer } from '@faubulous/mentor-rdf-parsers';

interface ValidateSparqlInput {
	query: string;
}

export class ValidateSparqlTool implements vscode.LanguageModelTool<ValidateSparqlInput> {
	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ValidateSparqlInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { query } = options.input;
		const lexingResult = new SparqlLexer().tokenize(query);
		let result: object;

		if (lexingResult.errors.length === 0) {
			result = { valid: true };
		} else {
			result = {
				valid: false,
				errors: lexingResult.errors.map(e => ({
					message: e.message,
					line: e.line,
					column: e.column
				}))
			};
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(result))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<ValidateSparqlInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Validating SPARQL query syntax' };
	}
}
