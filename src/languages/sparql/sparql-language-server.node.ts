import { createConnection, ProposedFeatures, Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver/node';
import { SparqlLexer, SparqlParser, IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Represents information about a SPARQL query scope (SELECT, CONSTRUCT, etc.).
 */
interface QueryScope {
	/**
	 * Whether this scope uses SELECT * (star select).
	 */
	isStarSelect: boolean;

	/**
	 * The depth of curly braces when this scope was created.
	 */
	depth: number;

	/**
	 * Variables and their occurrence tokens within this scope.
	 */
	variables: Map<string, IToken[]>;

	/**
	 * Variables that are projection targets in the SELECT clause (AS ?x).
	 */
	projectionVariables: Set<string>;
}

const connection = createConnection(ProposedFeatures.all);

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'sparql', 'SPARQL', new SparqlLexer(), new SparqlParser(), true);
	}

	override getLintDiagnostics(document: TextDocument, content: string, tokens: IToken[]): Diagnostic[] {
		// Get base diagnostics from parent class (prefix checks, etc.)
		const result = super.getLintDiagnostics(document, content, tokens);

		// Add SPARQL-specific unused variable diagnostics
		result.push(...this._getUnusedVariableDiagnostics(document, tokens));

		return result;
	}

	/**
	 * Get diagnostics for unused variables in SPARQL queries.
	 * A variable is considered unused if it appears only once and the query doesn't use SELECT *.
	 */
	private _getUnusedVariableDiagnostics(document: TextDocument, tokens: IToken[]): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const scopeStack: QueryScope[] = [];

		let currentDepth = 0;
		let expectingSelectClause = false;
		let inSelectClause = false;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (!token.tokenType) {
				continue;
			}

			switch (token.tokenType.name) {
				case RdfToken.SELECT.name:
				case RdfToken.CONSTRUCT.name:
				case RdfToken.DESCRIBE.name: {
					const newScope: QueryScope = {
						isStarSelect: false,
						depth: currentDepth,
						variables: new Map(),
						projectionVariables: new Set()
					};

					scopeStack.push(newScope);

					if (token.tokenType.name === RdfToken.SELECT.name) {
						expectingSelectClause = true;
						inSelectClause = true;
					}
					break;
				}
				case RdfToken.STAR.name: {
					if (inSelectClause && scopeStack.length > 0) {
						scopeStack[scopeStack.length - 1].isStarSelect = true;
					}
					break;
				}
				case RdfToken.LCURLY.name: {
					currentDepth++;

					if (expectingSelectClause) {
						expectingSelectClause = false;
						inSelectClause = false;
					}
					break;
				}
				case RdfToken.RCURLY.name: {
					currentDepth--;

					while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].depth > currentDepth) {
						const closedScope = scopeStack.pop()!;
						diagnostics.push(...this._checkScopeForUnusedVariables(document, closedScope));
					}
					break;
				}
				case RdfToken.VAR1.name:
				case RdfToken.VAR2.name: {
					if (scopeStack.length > 0) {
						const currentScope = scopeStack[scopeStack.length - 1];
						const varName = token.image;

						if (inSelectClause && i > 0) {
							const prevToken = tokens[i - 1];

							if (prevToken?.tokenType?.name === RdfToken.AS_KW.name) {
								currentScope.projectionVariables.add(varName);
							}
						}

						if (!currentScope.variables.has(varName)) {
							currentScope.variables.set(varName, []);
						}

						currentScope.variables.get(varName)!.push(token);
					}
					break;
				}
				case RdfToken.WHERE.name: {
					if (expectingSelectClause) {
						expectingSelectClause = false;
						inSelectClause = false;
					}
					break;
				}
			}
		}

		while (scopeStack.length > 0) {
			const closedScope = scopeStack.pop()!;

			diagnostics.push(...this._checkScopeForUnusedVariables(document, closedScope));
		}

		return diagnostics;
	}

	/**
	 * Check a query scope for unused variables and return diagnostics.
	 */
	private _checkScopeForUnusedVariables(document: TextDocument, scope: QueryScope): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		if (scope.isStarSelect) {
			return diagnostics;
		}

		for (const [varName, occurrences] of scope.variables) {
			if (occurrences.length === 1 && !scope.projectionVariables.has(varName)) {
				const token = occurrences[0];

				diagnostics.push({
					code: 'UnusedVariableHint',
					severity: DiagnosticSeverity.Hint,
					tags: [DiagnosticTag.Unnecessary],
					message: `Variable '${varName}' is used only once.`,
					range: {
						start: document.positionAt(token.startOffset),
						end: document.positionAt((token.endOffset ?? token.startOffset) + 1)
					}
				});
			}
		}

		return diagnostics;
	}
}

new SparqlLanguageServer().start();
