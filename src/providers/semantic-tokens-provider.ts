import * as vscode from "vscode";
import { FeatureProvider } from "./feature-provider";

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

export const SemanticTokensLegend = new vscode.SemanticTokensLegend(Object.values(SemanticTokenType), Object.values(SemanticTokenModifier));

export class SemanticTokensProvider extends FeatureProvider implements vscode.DocumentSemanticTokensProvider {
	public provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
		const context = this.getDocumentContext(document);

		if (!context) {
			return new vscode.SemanticTokens(new Uint32Array(0));
		}

		const builder = new vscode.SemanticTokensBuilder(SemanticTokensLegend);

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
							let s = this._countLeadingSpaces(l);

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

	private _countLeadingSpaces(str: string) {
		for (var i = 0; i < str.length; i++) {
			if (str[i] != " " && str[i] != "\t") {
				return (i);
			}
		};

		return (str.length);
	}

	public provideDocumentSemanticTokensEdits(document: vscode.TextDocument, previousResultId: string): vscode.ProviderResult<vscode.SemanticTokens | vscode.SemanticTokensEdits> {
		return this.provideDocumentSemanticTokens(document);
	}
}