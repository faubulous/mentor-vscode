import * as vscode from 'vscode';
import { TurtleParser } from 'millan';

// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-provider

const tokenTypes = ['keyword', 'namespace', 'class', 'property', 'label', 'comment', 'string', 'number', 'variable', 'decorator', 'operator', 'const', 'enumMember', 'typeParameter'];
const tokenModifiers = ['definition', 'declaration', 'documentation', 'readonly', 'modification', 'async', 'defaultLibrary'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

const provider: vscode.DocumentSemanticTokensProvider = {
	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		// analyze the document and return semantic tokens
		const parser = new TurtleParser();

		parser.parse(document.getText(), 'standard');

		const tokens = parser.input;
		const tokensBuilder = new vscode.SemanticTokensBuilder(legend);

		let lastToken: string | undefined = undefined;

		for (let t of tokens) {
			try {
				const startLine = t.startLine ? t.startLine - 1 : 0;
				const startColumn = t.startColumn ? t.startColumn - 1 : 0;
				const endLine = t.endLine ? t.endLine - 1 : 0;
				const endColumn = t.endColumn ? t.endColumn : 0;

				const start = new vscode.Position(startLine, startColumn);
				const end = new vscode.Position(endLine, endColumn);

				const token = t.tokenType?.tokenName;

				if (!token) {
					continue;
				}

				switch (token) {
					case "A":
					case "TTL_PREFIX":
						tokensBuilder.push(new vscode.Range(start, end), 'keyword');
						break;
					case "PNAME_NS":
						tokensBuilder.push(new vscode.Range(start, end), 'namespace', ['definition']);
						break;
					case "PNAME_LN":
						const p = t.image.split(":")[0];

						if (lastToken === "DoubleCaret") {
							tokensBuilder.push(new vscode.Range(start, end), 'decorator');
						} else {
							tokensBuilder.push(new vscode.Range(new vscode.Position(startLine, startColumn), new vscode.Position(startLine, startColumn + p.length + 1)), 'namespace', ['declaration']);
							tokensBuilder.push(new vscode.Range(new vscode.Position(startLine, startColumn + p.length + 1), new vscode.Position(startLine, endColumn)), 'label', []);
						}
						break;
					case "IRIREF":
						if (lastToken === "DoubleCaret") {
							tokensBuilder.push(new vscode.Range(start, end), 'decorator');
						} else {
							tokensBuilder.push(new vscode.Range(start, end), 'enumMember', ['readonly']);
						}
						break;
					case "STRING_LITERAL_SINGLE_QUOTE":
					case "STRING_LITERAL_LONG_QUOTE":
					case "STRING_LITERAL_QUOTE":
						tokensBuilder.push(new vscode.Range(start, end), 'string');
						break;
					case "DoubleCaret":
					case "LANGTAG":
						tokensBuilder.push(new vscode.Range(start, end), 'decorator');
						break;
					case "INTEGER":
					case "DECIMAL":
					case "DOUBLE":
						tokensBuilder.push(new vscode.Range(start, end), 'number');
						break;
					case "COMMENT":
						tokensBuilder.push(new vscode.Range(start, end), 'comment');
						break;
					default:
						// tokensBuilder.push(new vscode.Range(start, end), 'const');
						continue;
				}

				lastToken = token
			} catch (e) {
				console.error(e);
				continue;
			}
		}

		return tokensBuilder.build();
	}
};

export function activate(context: vscode.ExtensionContext) {
	const selector = { language: 'turtle' };

	vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, legend);
}