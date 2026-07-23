import * as vscode from 'vscode';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver-types';
import { LintingProvider } from '@src/providers/linting/linting-provider';
import { LintingContext } from '@src/providers/linting/linting-context';

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
 * Lint rule that reports SPARQL variables which are used only once. A variable
 * is considered unused if it appears a single time within its query scope, the
 * scope does not use SELECT *, and the variable is not a projection target
 * (AS ?x) or projected into the scope by a subquery.
 *
 * @note Only applicable to SPARQL documents.
 */
export class SparqlUnusedVariableLinter implements LintingProvider {
	private _scopeStack: QueryScope[] = [];

	private _currentDepth = 0;

	private _expectingSelectClause = false;

	private _inSelectClause = false;

	reset(): void {
		this._scopeStack = [];
		this._currentDepth = 0;
		this._expectingSelectClause = false;
		this._inSelectClause = false;
	}

	visitToken(context: LintingContext, token: IToken, index: number): Diagnostic[] {
		if (!token.tokenType) {
			return [];
		}

		// Only check the variable usage in SELECT/CONSTRUCT/DESCRIBE queries.
		// In ASK queries, all variables are considered used.
		switch (token.tokenType.name) {
			case RdfToken.SELECT.name:
			case RdfToken.CONSTRUCT.name:
			case RdfToken.DESCRIBE.name: {
				// Start tracking a new query scope
				this._scopeStack.push({
					isStarSelect: false,
					depth: this._currentDepth,
					variables: new Map(),
					projectionVariables: new Set(),
					selectedVariables: new Set()
				});

				if (token.tokenType.name === RdfToken.SELECT.name) {
					this._expectingSelectClause = true;
					this._inSelectClause = true;
				}
				break;
			}
			case RdfToken.STAR.name: {
				// Check if this is a SELECT * (star in select clause)
				if (this._inSelectClause && this._scopeStack.length > 0) {
					this._scopeStack[this._scopeStack.length - 1].isStarSelect = true;
				}
				break;
			}
			case RdfToken.LCURLY.name: {
				this._currentDepth++;

				// End of SELECT clause when we hit the first curly brace
				if (this._expectingSelectClause) {
					this._expectingSelectClause = false;
					this._inSelectClause = false;
				}
				break;
			}
			case RdfToken.RCURLY.name: {
				this._currentDepth--;

				// Check if any scopes should be closed
				const diagnostics: Diagnostic[] = [];

				while (this._scopeStack.length > 0 && this._scopeStack[this._scopeStack.length - 1].depth > this._currentDepth) {
					const closedScope = this._scopeStack.pop()!;

					diagnostics.push(...this._checkScopeForUnusedVariables(context.document, closedScope));
					this._propagateProjectedVariables(closedScope);
				}

				return diagnostics;
			}
			case RdfToken.VAR1.name:
			case RdfToken.VAR2.name: {
				// Track variable occurrences in the current scope
				if (this._scopeStack.length > 0) {
					const currentScope = this._scopeStack[this._scopeStack.length - 1];
					const varName = token.image;

					if (this._inSelectClause) {
						// Variables in the SELECT clause are projected to the parent scope
						// when this scope is a subquery.
						currentScope.selectedVariables.add(varName);

						// Check if this variable is a projection target (preceded by AS).
						if (index > 0 && context.tokens[index - 1]?.tokenType?.name === RdfToken.AS_KW.name) {
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
				if (this._expectingSelectClause) {
					this._expectingSelectClause = false;
					this._inSelectClause = false;
				}
				break;
			}
		}

		return [];
	}

	finalize(context: LintingContext): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		// Check any remaining scopes at end of document
		while (this._scopeStack.length > 0) {
			const closedScope = this._scopeStack.pop()!;

			diagnostics.push(...this._checkScopeForUnusedVariables(context.document, closedScope));
			this._propagateProjectedVariables(closedScope);
		}

		return diagnostics;
	}

	/**
	 * Propagates the variables a closed subquery scope projects to its parent scope so
	 * that the parent treats them as used (a subquery's SELECT list is available to the
	 * outer query). Has no effect when the closed scope is the top-level query.
	 */
	private _propagateProjectedVariables(closedScope: QueryScope): void {
		if (this._scopeStack.length === 0) {
			return;
		}

		const parentScope = this._scopeStack[this._scopeStack.length - 1];

		for (const varName of closedScope.selectedVariables) {
			parentScope.projectionVariables.add(varName);
		}
	}

	/**
	 * Check a query scope for unused variables and return diagnostics.
	 */
	private _checkScopeForUnusedVariables(document: vscode.TextDocument, scope: QueryScope): Diagnostic[] {
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
