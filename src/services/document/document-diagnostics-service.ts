import * as vscode from 'vscode';
import type { ILexingError } from 'chevrotain';
import { createFileBlankNodeIdGenerator, IRecognitionException, IToken, RdfSyntax, tokenizeWithTriplate } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic as LspDiagnostic, DiagnosticSeverity as LspDiagnosticSeverity, Range as LspRange } from 'vscode-languageserver-types';
import { ParserFactory } from '@src/languages/parser-factory';
import { SparqlUnusedVariableLinter } from '@src/languages/sparql/sparql-unused-variable-linter';
import { XmlParser } from '@src/languages/xml/xml-parser';
import { getConfig } from '@src/utilities/vscode/config';
import { getNamespaceDefinition, PrefixMap } from '@src/utilities';
import { LintingContext, LintingProvider } from '@src/linters';
import {
	DeprecatedWorkspaceUriLinter,
	InlineSingleUseBlankNodesLinter,
	NamespacePrefixLinter,
	XsdAnyUriLiteralLinter,
	XsdDatatypeValidationLinter,
} from '@src/linters/providers';
import { IDocumentContext, isTokenizedDocumentContext, ITokenizedDocumentContext } from './document-context.interface';
import { IDocumentTokenSource } from './document-token-source.interface';

/**
 * Computes document diagnostics in the extension host: syntax (lexer/parser)
 * errors and lint rule results for the Turtle family and SPARQL, and parse
 * errors for RDF/XML.
 *
 * By default (`mentor.index.diagnoseFiles`), every loaded document is
 * validated — including the editor-invisible documents opened by the workspace
 * indexer — so the problems panel gives an overview of all issues in the
 * workspace after an index run. Because VS Code garbage-collects documents that
 * are not shown in an editor shortly after the indexer opened them, diagnostics
 * are kept when such documents close and are only removed when the file itself
 * is deleted or renamed. When the setting is disabled, only documents visible
 * in an editor are validated, which speeds up workspace indexing.
 *
 * Validation is triggered by token deliveries from the token source (document
 * loads and debounced edits) and by documents becoming visible.
 */
export class DocumentDiagnosticsService implements vscode.Disposable {
	private readonly _collection = vscode.languages.createDiagnosticCollection('mentor');

	/**
	 * Pluggable lint rules that apply to all token-based documents.
	 */
	private readonly _linters: LintingProvider[] = [
		new DeprecatedWorkspaceUriLinter(),
		new InlineSingleUseBlankNodesLinter(),
		new NamespacePrefixLinter(),
		new XsdAnyUriLiteralLinter(),
		new XsdDatatypeValidationLinter(),
	];

	/**
	 * Additional lint rules that only apply to SPARQL documents.
	 */
	private readonly _sparqlLinters: LintingProvider[] = [
		new SparqlUnusedVariableLinter(),
	];

	private readonly _subscriptions: vscode.Disposable[] = [];

	/**
	 * @param tokenSource The token source whose deliveries trigger validation.
	 * @param _getContext Returns the document context for a URI, or `undefined` when
	 * none is loaded. Injected as a function to avoid a construction-order cycle with
	 * the document context service.
	 */
	constructor(
		tokenSource: IDocumentTokenSource,
		private readonly _getContext: (uri: string) => IDocumentContext | undefined
	) {
		this._subscriptions.push(
			tokenSource.onDidDeliverTokens(delivery => this._validateIfInScope(delivery.uri)),
			vscode.window.onDidChangeVisibleTextEditors(editors => {
				for (const editor of editors) {
					this._validate(editor.document);
				}
			}),
			vscode.workspace.onDidCloseTextDocument(document => this._handleDocumentClosed(document)),
			vscode.workspace.onDidDeleteFiles(e => {
				for (const uri of e.files) {
					this._collection.delete(uri);
				}
			}),
			vscode.workspace.onDidRenameFiles(e => {
				// The renamed file is re-indexed under its new URI, which re-validates it.
				for (const file of e.files) {
					this._collection.delete(file.oldUri);
				}
			}),
			vscode.workspace.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('mentor.index.diagnoseFiles')) {
					// Reset to the new scope: drop everything and re-validate what is
					// visible; a re-index repopulates the workspace-wide overview.
					this._collection.clear();

					for (const editor of vscode.window.visibleTextEditors) {
						this._validate(editor.document);
					}
				}
			})
		);

		// Validate the editors that are already visible at construction time. Documents
		// without a loaded context yet are picked up by the token deliveries that follow.
		for (const editor of vscode.window.visibleTextEditors) {
			this._validate(editor.document);
		}
	}

	/**
	 * Indicates whether all indexed files are validated (workspace-wide problems
	 * overview) or only documents visible in an editor.
	 */
	private _isWorkspaceScope(): boolean {
		return getConfig().get('index.diagnoseFiles', true);
	}

	/**
	 * Removes diagnostics for closed documents — but only when validation is
	 * scoped to visible editors, or the document is discarded with its close
	 * (e.g. untitled). With workspace-wide validation, VS Code garbage-collecting
	 * the editor-invisible documents opened by the indexer must not erase the
	 * problems overview.
	 * @param document The closed document.
	 */
	private _handleDocumentClosed(document: vscode.TextDocument): void {
		const isDiscarded = document.uri.scheme === 'untitled' || document.uri.scheme === 'git';

		if (this._isWorkspaceScope() && !isDiscarded) {
			return;
		}

		this._collection.delete(document.uri);
	}

	/**
	 * Validates the document for a URI when it is in scope: any loaded document
	 * when `index.diagnoseFiles` is enabled, otherwise only documents
	 * visible in an editor.
	 * @param uri The document URI.
	 */
	private _validateIfInScope(uri: string): void {
		if (this._isWorkspaceScope()) {
			const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri);

			if (document) {
				this._validate(document);
			}

			return;
		}

		const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri);

		if (editor) {
			this._validate(editor.document);
		}
	}

	/**
	 * Computes and publishes diagnostics for a locally tokenized document,
	 * mirroring the language server's validation: lexer errors, parser and
	 * semantic errors, and lint rule results.
	 * @param document The document to validate.
	 */
	private _validate(document: vscode.TextDocument): void {
		const uri = document.uri.toString();
		const context = this._getContext(uri);

		if (!context) {
			return;
		}

		const content = document.getText();

		if (!content.length) {
			this._collection.set(document.uri, []);
			return;
		}

		try {
			if (isTokenizedDocumentContext(context)) {
				this._collection.set(document.uri, this._computeDiagnostics(document, context, content));
			} else {
				// Structurally parsed documents (RDF/XML): the parse either succeeds
				// or the catch below reports the failure, matching the previous
				// language server behavior.
				new XmlParser().parse(content);
				this._collection.set(document.uri, []);
			}
		} catch (e) {
			this._collection.set(document.uri, [
				new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 0),
					e ? e.toString() : 'An error occurred while parsing the document.',
					vscode.DiagnosticSeverity.Error
				),
			]);
		}
	}

	private _computeDiagnostics(document: vscode.TextDocument, context: ITokenizedDocumentContext, content: string): vscode.Diagnostic[] {
		const lexer = ParserFactory.getLexer(context.syntax);

		// The lexer instance is shared — set the generator on every call so a
		// file-scoped generator does not leak between documents.
		lexer.blankNodeIdGenerator = createFileBlankNodeIdGenerator(document.uri.toString());

		// Triplate-aware tokenization: the parser consumes placeholder `parseTokens`
		// (so its CST/error recovery stay correct) while `tokens` is the faithful
		// stream that the lint diagnostics consume. `lexErrors` are the characters
		// the lexer could not match — it skips them (no token is emitted), so they
		// are only surfaced here.
		const { tokens, parseTokens, errors: lexErrors } = tokenizeWithTriplate(lexer, content);

		const parser = ParserFactory.getParser(context.syntax);

		parser.parse(parseTokens, false);

		const errors = [...parser.errors, ...parser.semanticErrors];

		const linters = context.syntax === RdfSyntax.Sparql
			? [...this._linters, ...this._sparqlLinters]
			: this._linters;

		const diagnostics = [
			...this._getLexDiagnostics(document, lexErrors),
			...this._getParseDiagnostics(document, errors),
			...this._getLintDiagnostics(document, content, tokens, linters),
		];

		return diagnostics.map(d => this._toVscodeDiagnostic(d));
	}

	/**
	 * Maps lexer errors to diagnostics. The lexer skips characters it cannot
	 * match (no token is emitted for them) and records them here, so these are
	 * the only signal for invalid characters — e.g. junk appended to an IRI —
	 * that leaves a token stream which still parses.
	 */
	private _getLexDiagnostics(document: vscode.TextDocument, errors: ILexingError[]): LspDiagnostic[] {
		return errors.map(
			(error): LspDiagnostic => {
				// Guarantee a visible range even for a zero-length error.
				const length = Math.max(error.length ?? 0, 1);

				return {
					severity: LspDiagnosticSeverity.Error,
					message: error.message,
					range: {
						start: document.positionAt(error.offset),
						end: document.positionAt(error.offset + length),
					},
				};
			}
		);
	}

	private _getParseDiagnostics(document: vscode.TextDocument, errors: IRecognitionException[]): LspDiagnostic[] {
		const content = document.getText();

		return errors.map(
			(error): LspDiagnostic => {
				const { message, name, context, token } = error;

				const ruleStack = context ? context.ruleStack : null;
				const source = ruleStack && ruleStack.length > 0
					? ruleStack[ruleStack.length - 1]
					: undefined;

				const constructedDiagnostic: Partial<LspDiagnostic> = {
					code: name,
					message,
					source,
					severity: LspDiagnosticSeverity.Error,
				};

				if (token.tokenType?.name !== 'EOF') {
					constructedDiagnostic.range = LspRange.create(
						document.positionAt(token.startOffset),
						document.positionAt((token.endOffset ?? token.startOffset) + 1)
					);
				} else {
					const { previousToken = {} } = error as any; // chevrotain doesn't have this typed fully, but it exists for early exit exceptions

					let rangeStart;
					let rangeEnd;

					if (typeof previousToken.endOffset !== 'undefined') {
						rangeStart = Math.min(previousToken.endOffset + 1, content.length);
						rangeEnd = Math.min(previousToken.endOffset + 2, content.length);
					} else {
						rangeStart = rangeEnd = content.length;
					}

					constructedDiagnostic.range = LspRange.create(
						document.positionAt(rangeStart),
						document.positionAt(rangeEnd)
					);
				}

				return constructedDiagnostic as LspDiagnostic;
			}
		);
	}

	private _getLintDiagnostics(document: vscode.TextDocument, content: string, tokens: IToken[], linters: LintingProvider[]): LspDiagnostic[] {
		const prefixes: PrefixMap = {};
		const context: LintingContext = { document, content, tokens, prefixes };
		const result: LspDiagnostic[] = [];

		for (const linter of linters) {
			linter.reset?.();
		}

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			const type = token.tokenType?.name;

			// Keep the shared prefix map current so IRI-resolving providers see up-to-date prefixes.
			if (type === 'PREFIX' || type === 'TTL_PREFIX') {
				const ns = getNamespaceDefinition(tokens, token);

				if (ns) {
					prefixes[ns.prefix] = ns.uri;
				}
			}

			for (const linter of linters) {
				result.push(...linter.visitToken(context, token, i));
			}
		}

		for (const linter of linters) {
			result.push(...(linter.finalize?.(context) ?? []));
		}

		return result;
	}

	/**
	 * Converts an LSP protocol diagnostic — as produced by the shared diagnostics
	 * functions — into a vscode API diagnostic.
	 */
	private _toVscodeDiagnostic(diagnostic: LspDiagnostic): vscode.Diagnostic {
		const range = new vscode.Range(
			diagnostic.range.start.line,
			diagnostic.range.start.character,
			diagnostic.range.end.line,
			diagnostic.range.end.character
		);

		// LSP severities are 1-based (Error = 1); vscode severities are 0-based (Error = 0).
		const severity = (diagnostic.severity ?? 1) - 1;

		// LSP allows MarkupContent messages; the diagnostics produced here are always plain strings.
		const message = typeof diagnostic.message === 'string' ? diagnostic.message : diagnostic.message.value;

		const result = new vscode.Diagnostic(range, message, severity);

		result.source = diagnostic.source;
		result.code = diagnostic.code;

		// LSP and vscode diagnostic tags share the same values (Unnecessary = 1, Deprecated = 2).
		if (diagnostic.tags) {
			result.tags = diagnostic.tags as unknown as vscode.DiagnosticTag[];
		}

		return result;
	}

	dispose(): void {
		this._collection.dispose();

		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}
	}
}
