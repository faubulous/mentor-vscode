import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { RenameProvider } from './rename-provider';

// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-provider

enum SemanticTokenType {
	keyword = 'keyword',
	namespace = 'namespace',
	comment = 'comment',
	decorator = 'decorator',
	label = 'label',
	enumMember = 'enumMember',
	string = 'string',
	number = 'number',
}

enum SemanticTokenModifier {
	definition = 'definition',
	declaration = 'declaration',
	readonly = 'readonly',
}

const legend = new vscode.SemanticTokensLegend(Object.values(SemanticTokenType), Object.values(SemanticTokenModifier));

const tokenProvider: vscode.DocumentSemanticTokensProvider = {
	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		const uri = document.uri.toString();

		if (mentor.contexts[uri]) {
			const context = mentor.contexts[uri];
			const builder = new vscode.SemanticTokensBuilder(legend);

			let lastToken: string | undefined = undefined;

			for (let t of context.tokens) {
				try {
					const startLine = t.startLine ? t.startLine - 1 : 0;
					const startColumn = t.startColumn ? t.startColumn - 1 : 0;
					const endLine = t.endLine ? t.endLine - 1 : 0;
					const endColumn = t.endColumn ? t.endColumn : 0;

					const tokenRange = new vscode.Range(new vscode.Position(startLine, startColumn), new vscode.Position(endLine, endColumn));
					const tokenName = t.tokenType?.tokenName;

					if (!tokenName) {
						continue;
					}

					switch (tokenName) {
						case "A":
						case "TTL_PREFIX":
							builder.push(tokenRange, SemanticTokenType.keyword);
							break;
						case "PNAME_NS":
							builder.push(tokenRange, SemanticTokenType.namespace, [SemanticTokenModifier.definition]);
							break;
						case "PNAME_LN": {
							const p = t.image.split(":")[0];

							if (lastToken === "DoubleCaret") {
								builder.push(tokenRange, SemanticTokenType.decorator);
							} else {
								const prefixRange = new vscode.Range(
									new vscode.Position(startLine, startColumn),
									new vscode.Position(startLine, startColumn + p.length + 1)
								);

								builder.push(prefixRange, SemanticTokenType.namespace);

								const labelRange = new vscode.Range(
									new vscode.Position(startLine, startColumn + p.length + 1),
									new vscode.Position(startLine, endColumn)
								)

								builder.push(labelRange, SemanticTokenType.label);
							}
							break;
						}
						case "IRIREF":
							if (lastToken === "DoubleCaret") {
								builder.push(tokenRange, SemanticTokenType.decorator);
							} else {
								builder.push(tokenRange, SemanticTokenType.enumMember, [SemanticTokenModifier.readonly]);
							}
							break;
						case "STRING_LITERAL_SINGLE_QUOTE":
						case "STRING_LITERAL_QUOTE":
							builder.push(tokenRange, SemanticTokenType.string);
							break;
						case "STRING_LITERAL_LONG_QUOTE": {
							let p = startColumn;
							let n = startLine;

							for (const l of t.image.split("\n")) {
								let s = countLeadingSpaces(l);

								const r = new vscode.Range(
									new vscode.Position(n, p > -1 ? p : s),
									new vscode.Position(n, p > -1 ? p + l.length : l.length)
								);

								builder.push(r, SemanticTokenType.string);

								n++;
								p = -1;
							}
							break;
						}
						case "DoubleCaret":
						case "LANGTAG":
							builder.push(tokenRange, SemanticTokenType.decorator);
							break;
						case "INTEGER":
						case "DECIMAL":
						case "DOUBLE":
							builder.push(tokenRange, SemanticTokenType.number);
							break;
						case "Comment":
							builder.push(tokenRange, SemanticTokenType.comment);
							break;
						default:
							continue;
					}

					lastToken = tokenName
				} catch (e) {
					console.error(e);
					continue;
				}
			}

			return builder.build();
		}
	}
};

function countLeadingSpaces(str: string) {
	for (var i = 0; i < str.length; i++) {
		if (str[i] != " " && str[i] != "\t") {
			return (i);
		}
	};

	return (str.length);
}

const renameProvider: vscode.RenameProvider = new RenameProvider();

export class TurtleTokenProvider {
	register(): vscode.Disposable[] {
		return [
			vscode.languages.registerDocumentSemanticTokensProvider({ language: 'turtle' }, tokenProvider, legend),
			vscode.languages.registerRenameProvider({ language: 'turtle' }, renameProvider),
			vscode.languages.registerDocumentSemanticTokensProvider({ language: 'trig' }, tokenProvider, legend),
			vscode.languages.registerRenameProvider({ language: 'trig' }, renameProvider),
			vscode.languages.registerDocumentSemanticTokensProvider({ language: 'ntriples' }, tokenProvider, legend),
			vscode.languages.registerRenameProvider({ language: 'ntriples' }, renameProvider),
			vscode.languages.registerDocumentSemanticTokensProvider({ language: 'nquads' }, tokenProvider, legend),
			vscode.languages.registerRenameProvider({ language: 'nquads' }, renameProvider),
		];
	}
}