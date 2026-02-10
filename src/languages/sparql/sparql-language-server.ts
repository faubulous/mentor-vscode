import { IToken } from 'millan';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from '@src/languages/language-server';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver/browser';
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
}

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL', new SparqlSyntaxParser());
	}

	override getUnquotedLiteralValue(token: IToken): string {
		switch (token?.tokenType?.tokenName) {
			case "STRING_LITERAL1":
			case "STRING_LITERAL2":
				return token.image.substring(1, token.image.length - 1);
			case "STRING_LITERAL_LONG1":
			case "STRING_LITERAL_LONG2":
				return token.image.substring(3, token.image.length - 3);
		}

		return token.image;
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
			const tokenType = token.tokenType?.tokenName;

			if (!tokenType) {
				continue;
			}

			// Only check the variable usage in SELECT/CONSTRUCT/DESCRIBE queries.
			// In ASK queries, all variables are considered used.
			switch (tokenType) {
				case 'SELECT':
				case 'CONSTRUCT':
				case 'DESCRIBE': {
					// Start tracking a new query scope
					const newScope: QueryScope = {
						isStarSelect: false,
						depth: currentDepth,
						variables: new Map()
					};

					scopeStack.push(newScope);

					if (tokenType === 'SELECT') {
						expectingSelectClause = true;
						inSelectClause = true;
					}
					break;
				}

				case 'Star': {
					// Check if this is a SELECT * (star in select clause)
					if (inSelectClause && scopeStack.length > 0) {
						scopeStack[scopeStack.length - 1].isStarSelect = true;
					}
					break;
				}

				case 'LCurly': {
					currentDepth++;

					// End of SELECT clause when we hit the first curly brace
					if (expectingSelectClause) {
						expectingSelectClause = false;
						inSelectClause = false;
					}
					break;
				}

				case 'RCurly': {
					currentDepth--;

					// Check if any scopes should be closed
					while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].depth > currentDepth) {
						const closedScope = scopeStack.pop()!;
						diagnostics.push(...this._checkScopeForUnusedVariables(document, closedScope));
					}
					break;
				}

				case 'VAR1':
				case 'VAR2': {
					// Track variable occurrences in the current scope
					if (scopeStack.length > 0) {
						const currentScope = scopeStack[scopeStack.length - 1];
						const varName = token.image;

						if (!currentScope.variables.has(varName)) {
							currentScope.variables.set(varName, []);
						}

						currentScope.variables.get(varName)!.push(token);
					}
					break;
				}

				case 'WHERE': {
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
			// A variable that appears only once is considered unused
			if (occurrences.length === 1) {
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