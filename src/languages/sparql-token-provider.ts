import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { RenameProvider } from '../providers/rename-provider';
import { CompletionItemProvider, DefinitionProvider, HoverProvider, ReferenceProvider } from '../providers';

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
	variable = 'variable',
	function = 'function'
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
						case 'A':
						case 'ADD':
						case 'ALL':
						case 'AS':
						case 'ASC':
						case 'ASK':
						case 'BIND':
						case 'BY':
						case 'CLEAR':
						case 'CONSTRUCT':
						case 'COPY':
						case 'CREATE':
						case 'DEFAULT':
						case 'DELETE':
						case 'DELETE_DATA':
						case 'DATA':
						case 'DESC':
						case 'DESCRIBE':
						case 'DISTINCT':
						case 'DROP':
						case 'EXPLICIT':
						case 'FILTER':
						case 'FROM':
						case 'GRAPH':
						case 'GROUP':
						case 'HAVING':
						case 'IN':
						case 'INSERT':
						case 'INSERT_DATA':
						case 'LIMIT':
						case 'LOAD':
						case 'MINUS':
						case 'MOVE':
						case 'NAMED':
						case 'NOT':
						case 'OFFSET':
						case 'OPTIONAL':
						case 'ORDER':
						case 'PREFIX':
						case 'REDUCED':
						case 'SELECT':
						case 'SERVICE':
						case 'TO':
						case 'UNION':
						case 'USING':
						case 'VALUES':
						case 'WHERE':
						case 'WITH':
							builder.push(tokenRange, SemanticTokenType.keyword);
							break;
						case 'ABS':
						case 'ACOS':
						case 'ACOSH':
						case 'ASIN':
						case 'ASINH':
						case 'ATAN':
						case 'ATAN2':
						case 'ATANH':
						case 'AVG':
						case 'BNODE':
						case 'BOUND':
						case 'CBRT':
						case 'CEIL':
						case 'COALESCE':
						case 'CONCAT':
						case 'CONTAINS':
						case 'COS':
						case 'COSH':
						case 'COUNT':
						case 'DATATYPE':
						case 'DATE':
						case 'DATE_TIME':
						case 'DATE_TIME_STAMP':
						case 'DAY':
						case 'DAY_TIME_DURATION':
						case 'DAYS':
						case 'DURATION':
						case 'DURATION_MONTHS':
						case 'DURATION_SECONDS':
						case 'ENCODE_FOR_URI':
						case 'ERF':
						case 'ERFC':
						case 'EXP':
						case 'EXP10':
						case 'EXP2':
						case 'FLOOR':
						case 'G_DAY':
						case 'G_MONTH':
						case 'G_MONTH_DAY':
						case 'G_YEAR_MONTH':
						case 'G_YEAR':
						case 'GROUP_CONCAT':
						case 'GAMMA':
						case 'HOURS':
						case 'IF':
						case 'IRI':
						case 'ISBLANK':
						case 'ISIRI':
						case 'ISLITERAL':
						case 'ISNUMERIC':
						case 'ISURI':
						case 'LANG':
						case 'LANGMATCHES':
						case 'LCASE':
						case 'LGAMMA':
						case 'LOG':
						case 'LOG10':
						case 'LOG2':
						case 'MAX':
						case 'MAXFN':
						case 'MD5':
						case 'MIN':
						case 'MINFN':
						case 'MINUTES':
						case 'MONTH':
						case 'MONTHS':
						case 'MUL':
						case 'NOW':
						case 'PI':
						case 'POW':
						case 'RAND':
						case 'REGEX':
						case 'REPLACE':
						case 'ROLE':
						case 'ROUND':
						case 'SAMETERM':
						case 'SAMPLE':
						case 'SECONDS':
						case 'SEPARATOR':
						case 'SHA1':
						case 'SHA256':
						case 'SHA384':
						case 'SHA512':
						case 'SIN':
						case 'SINH':
						case 'SQRT':
						case 'STR':
						case 'STRAFTER':
						case 'STRBEFORE':
						case 'STRDT':
						case 'STRENDS':
						case 'STRLANG':
						case 'STRLEN':
						case 'STRSTARTS':
						case 'STRUUID':
						case 'SUBSTR':
						case 'SUM':
						case 'TAN':
						case 'TANH':
						case 'TIME':
						case 'TIME_ON_TIMELINE':
						case 'TIMEZONE':
						case 'TO_TIMEZONE':
						case 'TZ':
						case 'UCASE':
						case 'URI':
						case 'UUID':
						case 'YEAR':
						case 'YEAR_MONTH_DURATION':
						case 'YEARS':
							builder.push(tokenRange, SemanticTokenType.function);
							break;
						case "PNAME_NS":
							builder.push(tokenRange, SemanticTokenType.namespace, [SemanticTokenModifier.definition]);
							break;
						case "PNAME_LN":
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
						case "IRIREF":
							if (lastToken === "DoubleCaret") {
								builder.push(tokenRange, SemanticTokenType.decorator);
							} else {
								builder.push(tokenRange, SemanticTokenType.enumMember, [SemanticTokenModifier.readonly]);
							}
							break;
						case "STRING_LITERAL":
						case "STRING_LITERAL2":
						case "STRING_LITERAL_QUOTE":
						case "STRING_LITERAL_SINGLE_QUOTE":
						case "STRING_LITERAL_LONG_QUOTE":
							builder.push(tokenRange, SemanticTokenType.string);
							break;
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
						case "Star":
						case "VAR1":
						case "VAR2":
							builder.push(tokenRange, SemanticTokenType.variable);
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

const renameProvider = new RenameProvider();
const referenceProvider = new ReferenceProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new CompletionItemProvider();

export class SparqlTokenProvider {
	register(): vscode.Disposable[] {
		return [
			vscode.languages.registerDocumentSemanticTokensProvider({ language: 'sparql' }, tokenProvider, legend),
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerHoverProvider({ language: 'sparql' }, hoverProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ':')
		];
	}
}