import * as vscode from 'vscode';
import { Uri } from "@faubulous/mentor-rdf";
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';
import { getIriFromIriReference, getIriFromPrefixedName, getNamespaceDefinition, getTokenPosition } from '@src/utilities';
import { getPrefixesWithErrorCode } from '@src/utilities/vscode/diagnostic';

/**
 * A provider for RDF document code actions.
 */
export class TurtleCodeActionsProvider extends TurtleFeatureProvider implements vscode.CodeActionProvider {
	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	/**
	 * The kinds of code actions provided by this provider.
	 */
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix,
		vscode.CodeActionKind.Refactor,
	];

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		return [
			...this._provideRefactoringActions(document, range, actionContext),
			...this._provideFixMissingPrefixesActions(document, actionContext)
		];
	}

	/**
	 * Get code actions that provide refactoring actions for the given document.
	 * @param document An RDF document context.
	 * @param range The range of the current edit.
	 * @param actionContext The action context.
	 * @returns An array of code actions.
	 */
	private _provideRefactoringActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return [];
		}

		const result: vscode.CodeAction[] = [];

		// Selection-based refactorings (range may span multiple lines).
		const inlinePrefixesAction = this._createInlineSelectedPrefixesAction(document, context, range);

		if (inlinePrefixesAction) {
			result.push(inlinePrefixesAction);
		}

		// Token-based refactorings for the current position.
		const token = context.getTokenAtPosition(range.start);

		if (!token) {
			return result;
		}

		switch (token.tokenType.name) {
			case RdfToken.IRIREF.name: {
				const namespaceIri = Uri.getNamespaceIri(getIriFromIriReference(token.image));

				result.push({
					kind: vscode.CodeActionKind.Refactor,
					title: 'Define prefix for IRI',
					isPreferred: true,
					command: {
						title: 'Define prefix for IRI',
						command: 'mentor.command.implementPrefixForIri',
						arguments: [document.uri, namespaceIri, token]
					}
				});

				break;
			}
			case RdfToken.PNAME_NS.name:
			case RdfToken.PREFIX.name:
			case RdfToken.TTL_PREFIX.name: {
				result.push({
					kind: vscode.CodeActionKind.Refactor,
					title: 'Sort prefixes',
					isPreferred: true,
					command: {
						title: 'Sort prefixes',
						command: 'mentor.command.sortPrefixes',
						arguments: [document.uri, token]
					}
				});

				// Add conversion actions for prefix definitions.
				if (token.tokenType.name === RdfToken.PREFIX.name) {
					result.push(this._createConvertPrefixAction(document, context, token, 'turtle'));
				} else if (token.tokenType.name === RdfToken.TTL_PREFIX.name) {
					result.push(this._createConvertPrefixAction(document, context, token, 'sparql'));
				}

				break;
			}
		}

		return result;
	}

	/**
	 * Creates a refactor code action that removes prefix definitions within the selected range
	 * and rewrites all PNAME occurrences of those prefixes into IRIREFs.
	 */
	private _createInlineSelectedPrefixesAction(document: vscode.TextDocument, context: TurtleDocument, selection: vscode.Range): vscode.CodeAction | undefined {
		const startLine = Math.min(selection.start.line, selection.end.line);
		const endLine = Math.max(selection.start.line, selection.end.line);

		// Find all prefix declaration tokens in the selected line range.
		const selectedPrefixDecls = context.tokens.filter(t => {
			const type = t.tokenType.name;

			if (type !== RdfToken.PREFIX.name && type !== RdfToken.TTL_PREFIX.name) {
				return false;
			}

			const line = (t.startLine ?? 1) - 1;
			return line >= startLine && line <= endLine;
		});

		if (selectedPrefixDecls.length === 0) {
			return;
		}

		const prefixToIri = new Map<string, string>();
		const prefixDeclLines = new Set<number>();

		for (const decl of selectedPrefixDecls) {
			const def = getNamespaceDefinition(context.tokens, decl);
			if (!def) continue;
			prefixToIri.set(def.prefix, def.uri);
			prefixDeclLines.add((decl.startLine ?? 1) - 1);
		}

		if (prefixToIri.size === 0) {
			return;
		}

		const prefixList = Array.from(prefixToIri.keys()).sort();
		const title = prefixList.length === 1
			? `Inline prefix: ${prefixList[0]}`
			: `Inline selected prefixes (${prefixList.length})`;

		const action: vscode.CodeAction = {
			kind: vscode.CodeActionKind.Refactor,
			title,
			isPreferred: false,
		};

		const edit = new vscode.WorkspaceEdit();
		const prefixMap = Object.fromEntries(prefixToIri);

		// 1) Remove the selected prefix definition lines.
		for (const line of prefixDeclLines) {
			if (line < 0 || line >= document.lineCount) continue;
			edit.delete(document.uri, document.lineAt(line).rangeIncludingLineBreak);
		}

		// 2) Replace all occurrences of pnames using those prefixes with IRIREFs.
		for (const t of context.tokens) {
			const type = t.tokenType.name;
			if (type !== RdfToken.PNAME_NS.name && type !== RdfToken.PNAME_LN.name) {
				continue;
			}

			const tokenLine = (t.startLine ?? 1) - 1;
			if (prefixDeclLines.has(tokenLine)) {
				continue;
			}

			const prefix = t.image.split(':')[0];
			if (!prefixToIri.has(prefix)) {
				continue;
			}

			const expandedIri = getIriFromPrefixedName(prefixMap, t.image);
			if (!expandedIri) {
				continue;
			}

			const { start, end } = getTokenPosition(t);
			const tokenRange = new vscode.Range(
				new vscode.Position(start.line, start.character),
				new vscode.Position(end.line, end.character)
			);

			edit.replace(document.uri, tokenRange, `<${expandedIri}>`);
		}

		if (edit.size > 0) {
			action.edit = edit;
			return action;
		}
	}

	/**
	 * Create a code action for converting all prefix definitions between Turtle and SPARQL styles.
	 * @param document The text document.
	 * @param context The Turtle document context.
	 * @param token The prefix token (PREFIX or TTL_PREFIX).
	 * @param targetStyle The target style to convert to ('turtle' for @prefix, 'sparql' for PREFIX).
	 * @returns A code action for converting all prefix definitions.
	 */
	private _createConvertPrefixAction(document: vscode.TextDocument, context: TurtleDocument, token: import('chevrotain').IToken, targetStyle: 'turtle' | 'sparql'): vscode.CodeAction {
		const title = targetStyle === 'turtle' ? 'Convert all to @prefix' : 'Convert all to PREFIX';

		const action: vscode.CodeAction = {
			kind: vscode.CodeActionKind.Refactor,
			title,
			isPreferred: false,
		};

		const edit = new vscode.WorkspaceEdit();

		// Iterate over all tokens and convert all prefix definitions to the target style.
		for (const t of context.tokens) {
			if (t.tokenType.name === RdfToken.PREFIX.name || t.tokenType.name === RdfToken.TTL_PREFIX.name) {
				const ns = getNamespaceDefinition(context.tokens, t);

				if (ns) {
					const line = (t.startLine ?? 1) - 1;
					const lineRange = document.lineAt(line).range;

					const newDefinition = targetStyle === 'turtle'
						? `@prefix ${ns.prefix}: <${ns.uri}> .`
						: `PREFIX ${ns.prefix}: <${ns.uri}>`;

					edit.replace(document.uri, lineRange, newDefinition);
				}
			}
		}

		if (edit.size > 0) {
			action.edit = edit;
		}

		return action;
	}

	/**
	 * Get a code action for defining missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	private _provideFixMissingPrefixesActions(document: vscode.TextDocument, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const result: vscode.CodeAction[] = [];

		const documentDiagnostics = vscode.languages.getDiagnostics(document.uri);

		// 1. Find all unused prefixes in the whole document, and add them as a repair option on top.
		const undefinedPrefixes = getPrefixesWithErrorCode(document, documentDiagnostics, 'UndefinedNamespacePrefixError');

		if (undefinedPrefixes.length > 0) {
			// Fixing missing prefixes is implemented as a command instead of a static edit because 
			// the document may change in the meantime and the insert range may no longer be valid.
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement missing prefixes',
					command: 'mentor.command.implementPrefixes',
					arguments: [document.uri, Array.from(undefinedPrefixes)]
				}
			});
		}

		// Note, the unused prefix diagnostics contain the _whole_ line of the prefix definition, so we need to extract the prefix from it.
		const unusedPrefixes = getPrefixesWithErrorCode(document, documentDiagnostics, 'UnusedNamespacePrefixHint');

		if (unusedPrefixes.length > 0) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Remove unused prefixes',
				isPreferred: true,
				command: {
					title: 'Remove unused prefixes',
					command: 'mentor.command.deletePrefixes',
					arguments: [document.uri, unusedPrefixes]
				}
			});
		}

		// 2. Find all unused prefixes in the context and add them as the second repair option.
		for (let prefix of getPrefixesWithErrorCode(document, actionContext.diagnostics, 'UndefinedNamespacePrefixError')) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Implement missing prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Implement missing prefix: ${prefix}`,
					command: 'mentor.command.implementPrefixes',
					arguments: [document.uri, [prefix]]
				}
			});
		}

		for (let prefix of getPrefixesWithErrorCode(document, actionContext.diagnostics, 'UnusedNamespacePrefixHint')) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Remove unused prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Remove unused prefix: ${prefix}`,
					command: 'mentor.command.deletePrefixes',
					arguments: [document.uri, [prefix]]
				}
			});
		}

		return result;
	}

}