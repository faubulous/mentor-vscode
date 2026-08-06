import * as vscode from 'vscode';
import type { ILexingError } from 'chevrotain';
import { createFileBlankNodeIdGenerator, IRecognitionException, IToken, RdfSyntax, tokenizeWithTriplate } from '@faubulous/mentor-rdf-parsers';
import { Diagnostic as LspDiagnostic, DiagnosticSeverity as LspDiagnosticSeverity, Range as LspRange } from 'vscode-languageserver-types';
import { ParserFactory } from '@src/languages/parser-factory';
import { SparqlUnusedVariableLinter } from '@src/languages/sparql/sparql-unused-variable-linter';
import { XmlParser } from '@src/languages/xml/xml-parser';
import { getConfig } from '@src/utilities/vscode/config';
import { createYieldBudget } from '@src/utilities/scheduling';
import { getNamespaceDefinition, PrefixMap } from '@src/utilities';
import { createPositionMapper, PositionMapper } from '@src/utilities/position';
import { LintingContext, LintingProvider } from '@src/providers/linting';
import {
	DeprecatedWorkspaceUriLinter,
	InlineSingleUseBlankNodesLinter,
	NamespacePrefixLinter,
	XsdAnyUriLiteralLinter,
	XsdDatatypeValidationLinter,
} from '@src/providers/linting/linters';
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
	 * Runs an explicit syntax and lint validation over the given files and
	 * publishes the results to the Problems panel — used by the Diagnose Workspace
	 * command. Reads each file's content (from an already-open document when
	 * present, otherwise from disk) and validates it in-process via
	 * {@link diagnoseContent}, without opening a `vscode.TextDocument`. Files that
	 * were not indexed (no context) or cannot be read are skipped.
	 * @param uris The files to validate.
	 * @param onProgress Optional callback invoked once per file with the number
	 * processed so far and the total, for status bar progress.
	 * @returns The number of files validated and how many have at least one error.
	 */
	async diagnoseFiles(
		uris: readonly vscode.Uri[],
		onProgress?: (processed: number, total: number) => void
	): Promise<{ validated: number; filesWithErrors: number }> {
		let validated = 0;
		let filesWithErrors = 0;

		// Validation is CPU-bound; yield between files so a workspace-wide pass
		// does not block the extension host.
		const yieldBudget = createYieldBudget();

		for (let i = 0; i < uris.length; i++) {
			const uri = uris[i];

			await yieldBudget.maybeYield();

			onProgress?.(i + 1, uris.length);

			// Only indexed files have a context to validate against.
			if (!this._getContext(uri.toString())) {
				continue;
			}

			// Prefer an already-open document's live text; otherwise read the bytes.
			const openDocument = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());

			let content: string;

			if (openDocument) {
				content = openDocument.getText();
			} else {
				try {
					content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
				} catch {
					// Binary/undecodable files cannot be validated as text.
					continue;
				}
			}

			this.diagnoseContent(uri, content);
			validated++;

			const problems = this._collection.get(uri) ?? [];

			if (problems.some(d => d.severity === vscode.DiagnosticSeverity.Error)) {
				filesWithErrors++;
			}
		}

		return { validated, filesWithErrors };
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
	 * Computes and publishes diagnostics for an open document, using its own
	 * `positionAt` for offset → position mapping.
	 * @param document The document to validate.
	 */
	private _validate(document: vscode.TextDocument): void {
		this._diagnose(document.uri, document.getText(), offset => document.positionAt(offset));
	}

	/**
	 * Computes and publishes syntax and lint diagnostics for an indexed file
	 * directly from its content, without opening a `vscode.TextDocument`. Mirrors
	 * how SHACL validation publishes from the in-memory context: offsets are
	 * mapped to positions with a content-backed mapper instead of a document.
	 * Used by the workspace indexer so `index.diagnoseFiles` gives a workspace-wide
	 * overview without the per-file document-open cost. Skips files without a
	 * loaded context.
	 * @param uri The document URI.
	 * @param content The document text (as read for indexing).
	 */
	diagnoseContent(uri: vscode.Uri, content: string): void {
		if (!this._getContext(uri.toString())) {
			return;
		}

		this._diagnose(uri, content, createPositionMapper(content));
	}

	/**
	 * Computes and publishes diagnostics for a locally tokenized document,
	 * mirroring the language server's validation: lexer errors, parser and
	 * semantic errors, and lint rule results.
	 * @param uri The document URI.
	 * @param content The document text.
	 * @param positionAt Maps a character offset to a position.
	 */
	private _diagnose(uri: vscode.Uri, content: string, positionAt: PositionMapper): void {
		const context = this._getContext(uri.toString());

		if (!context) {
			return;
		}

		if (!content.length) {
			this._collection.set(uri, []);
			return;
		}

		try {
			if (isTokenizedDocumentContext(context)) {
				this._collection.set(uri, this._computeDiagnostics(uri, context, content, positionAt));
			} else {
				// Structurally parsed documents (RDF/XML): the parse either succeeds
				// or the catch below reports the failure, matching the previous
				// language server behavior.
				new XmlParser().parse(content);
				this._collection.set(uri, []);
			}
		} catch (e) {
			this._collection.set(uri, [
				new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 0),
					e ? e.toString() : 'An error occurred while parsing the document.',
					vscode.DiagnosticSeverity.Error
				),
			]);
		}
	}

	private _computeDiagnostics(uri: vscode.Uri, context: ITokenizedDocumentContext, content: string, positionAt: PositionMapper): vscode.Diagnostic[] {
		// Reuse the token streams and errors captured by the context's parse()
		// when they were produced from exactly this content — the normal case,
		// because validation follows a token delivery or a document load. Only
		// the linters then run per validation.
		const cached = context.getParseResult(content);

		let tokens: IToken[];
		let lexErrors: ILexingError[];
		let errors: IRecognitionException[];

		if (cached) {
			tokens = cached.tokens;
			lexErrors = cached.lexErrors;
			errors = [...cached.parserErrors, ...cached.semanticErrors];
		} else {
			const lexer = ParserFactory.getLexer(context.syntax);

			// The lexer instance is shared — set the generator on every call so a
			// file-scoped generator does not leak between documents.
			lexer.blankNodeIdGenerator = createFileBlankNodeIdGenerator(uri.toString());

			// Triplate-aware tokenization: the parser consumes placeholder `parseTokens`
			// (so its CST/error recovery stay correct) while `tokens` is the faithful
			// stream that the lint diagnostics consume. `lexErrors` are the characters
			// the lexer could not match — it skips them (no token is emitted), so they
			// are only surfaced here.
			const lexingResult = tokenizeWithTriplate(lexer, content);

			tokens = lexingResult.tokens;
			lexErrors = lexingResult.errors;

			const parser = ParserFactory.getParser(context.syntax);

			parser.parse(lexingResult.parseTokens, false);

			errors = [...parser.errors, ...parser.semanticErrors];
		}

		const linters = context.syntax === RdfSyntax.Sparql
			? [...this._linters, ...this._sparqlLinters]
			: this._linters;

		const diagnostics = [
			...this._getLexDiagnostics(positionAt, lexErrors),
			...this._getParseDiagnostics(positionAt, content, errors),
			...this._getLintDiagnostics(positionAt, content, tokens, linters),
		];

		return diagnostics.map(d => this._toVscodeDiagnostic(d));
	}

	/**
	 * Maps lexer errors to diagnostics. The lexer skips characters it cannot
	 * match (no token is emitted for them) and records them here, so these are
	 * the only signal for invalid characters — e.g. junk appended to an IRI —
	 * that leaves a token stream which still parses.
	 */
	private _getLexDiagnostics(positionAt: PositionMapper, errors: ILexingError[]): LspDiagnostic[] {
		return errors.map(
			(error): LspDiagnostic => {
				// Guarantee a visible range even for a zero-length error.
				const length = Math.max(error.length ?? 0, 1);

				return {
					severity: LspDiagnosticSeverity.Error,
					message: error.message,
					range: {
						start: positionAt(error.offset),
						end: positionAt(error.offset + length),
					},
				};
			}
		);
	}

	private _getParseDiagnostics(positionAt: PositionMapper, content: string, errors: IRecognitionException[]): LspDiagnostic[] {
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
						positionAt(token.startOffset),
						positionAt((token.endOffset ?? token.startOffset) + 1)
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
						positionAt(rangeStart),
						positionAt(rangeEnd)
					);
				}

				return constructedDiagnostic as LspDiagnostic;
			}
		);
	}

	private _getLintDiagnostics(positionAt: PositionMapper, content: string, tokens: IToken[], linters: LintingProvider[]): LspDiagnostic[] {
		const prefixes: PrefixMap = {};
		const context: LintingContext = { positionAt, content, tokens, prefixes };
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
