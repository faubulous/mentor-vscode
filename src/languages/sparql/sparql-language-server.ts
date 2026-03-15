import { Connection, Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver/browser';
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

export class SparqlLanguageServer extends LanguageServerBase {
	constructor(connection: Connection) {
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

			// Only check the variable usage in SELECT/CONSTRUCT/DESCRIBE queries.
			// In ASK queries, all variables are considered used.
			switch (token.tokenType.name) {
				case RdfToken.SELECT.name:
				case RdfToken.CONSTRUCT.name:
				case RdfToken.DESCRIBE.name: {
					// Start tracking a new query scope
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
					// Check if this is a SELECT * (star in select clause)
					if (inSelectClause && scopeStack.length > 0) {
						scopeStack[scopeStack.length - 1].isStarSelect = true;
					}
					break;
				}
				case RdfToken.LCURLY.name: {
					currentDepth++;

					// End of SELECT clause when we hit the first curly brace
					if (expectingSelectClause) {
						expectingSelectClause = false;
						inSelectClause = false;
					}
					break;
				}
				case RdfToken.RCURLY.name: {
					currentDepth--;

					// Check if any scopes should be closed
					while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].depth > currentDepth) {
						const closedScope = scopeStack.pop()!;
						diagnostics.push(...this._checkScopeForUnusedVariables(document, closedScope));
					}
					break;
				}
				case RdfToken.VAR1.name:
				case RdfToken.VAR2.name: {
					// Track variable occurrences in the current scope
					if (scopeStack.length > 0) {
						const currentScope = scopeStack[scopeStack.length - 1];
						const varName = token.image;

						// Check if this variable is a projection target (preceded by AS in SELECT clause)
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
					// End of SELECT clause
					if (expectingSelectClause) {
						expectingSelectClause = false;
						inSelectClause = false;
					}
					break;
				}
			}
		}

		// Check any remaining scopes at end of document
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

		// Don't report unused variables if this is a SELECT * query
		if (scope.isStarSelect) {
			return diagnostics;
		}

		for (const [varName, occurrences] of scope.variables) {
			// A variable that appears only once is considered unused,
			// unless it's a projection target in the SELECT clause (AS ?x)
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
