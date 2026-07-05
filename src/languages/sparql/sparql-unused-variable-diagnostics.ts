import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver-types';
import { LintDocument } from '@src/languages/linter-context';

/**
 * @note This code is in the languages directory because it may not import vscode
 * APIs: it only uses LSP protocol types and the minimal {@link LintDocument}
 * document interface so it can run in the extension host.
 */

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
	 * Variables that are projection targets in the SELECT clause (AS ?x), plus
	 * variables projected into this scope by a closed subquery.
	 */
	projectionVariables: Set<string>;

	/**
	 * Variables listed in this scope's SELECT clause. These are projected to the
	 * parent scope when this scope is a subquery, so the parent must treat them as used.
	 */
	selectedVariables: Set<string>;
}

/**
 * Get diagnostics for unused variables in SPARQL queries.
 * A variable is considered unused if it appears only once and the query doesn't use SELECT *.
 * @param document The document being validated.
 * @param tokens All tokens produced by the lexer.
 * @returns One hint diagnostic per unused variable.
 */
export function getUnusedVariableDiagnostics(document: LintDocument, tokens: IToken[]): Diagnostic[] {
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
					projectionVariables: new Set(),
					selectedVariables: new Set()
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
					diagnostics.push(..._checkScopeForUnusedVariables(document, closedScope));
					_propagateProjectedVariables(closedScope, scopeStack);
				}
				break;
			}
			case RdfToken.VAR1.name:
			case RdfToken.VAR2.name: {
				// Track variable occurrences in the current scope
				if (scopeStack.length > 0) {
					const currentScope = scopeStack[scopeStack.length - 1];
					const varName = token.image;

					if (inSelectClause) {
						// Variables in the SELECT clause are projected to the parent scope
						// when this scope is a subquery.
						currentScope.selectedVariables.add(varName);

						// Check if this variable is a projection target (preceded by AS).
						if (i > 0 && tokens[i - 1]?.tokenType?.name === RdfToken.AS_KW.name) {
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

		diagnostics.push(..._checkScopeForUnusedVariables(document, closedScope));
		_propagateProjectedVariables(closedScope, scopeStack);
	}

	return diagnostics;
}

/**
 * Propagates the variables a closed subquery scope projects to its parent scope so
 * that the parent treats them as used (a subquery's SELECT list is available to the
 * outer query). Has no effect when the closed scope is the top-level query.
 */
function _propagateProjectedVariables(closedScope: QueryScope, scopeStack: QueryScope[]): void {
	if (scopeStack.length === 0) {
		return;
	}

	const parentScope = scopeStack[scopeStack.length - 1];

	for (const varName of closedScope.selectedVariables) {
		parentScope.projectionVariables.add(varName);
	}
}

/**
 * Check a query scope for unused variables and return diagnostics.
 */
function _checkScopeForUnusedVariables(document: LintDocument, scope: QueryScope): Diagnostic[] {
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
