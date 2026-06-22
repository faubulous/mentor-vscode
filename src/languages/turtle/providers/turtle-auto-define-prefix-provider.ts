import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { getConfig } from '@src/utilities/vscode/config';
import { getContentStartOffset } from '@src/utilities';
import { isTemplate } from 'triplate';
import { ITokenizedDocumentContext, isTokenizedDocumentContext } from '@src/services/document/document-context.interface';

/**
 * Describes a pending prefix that should be auto-defined once fresh tokens arrive.
 */
interface PendingPrefix {
	/**
	 * The document URI where the prefix was typed.
	 */
	documentUri: string;

	/**
	 * The position where the colon was typed.
	 */
	position: vscode.Position;
}

/**
 * A provider that automatically defines namespace prefixes when a colon is typed
 * in a prefixed name. This listens to document changes to capture the intent of
 * writing a prefix, then waits for fresh tokens from the language server before
 * processing the auto-define logic.
 */
export class TurtleAutoDefinePrefixProvider implements vscode.Disposable {
	private _pendingPrefix: PendingPrefix | undefined;

	private readonly _disposables: vscode.Disposable[] = [];

	constructor(languages: string[]) {
		const filter = languages.map(language => ({ language }));

		this._disposables.push(
			vscode.workspace.onDidChangeTextDocument(e => {
				if (!filter.some(f => f.language === e.document.languageId)) return;

				this._onDidChangeTextDocument(e);
			})
		);

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		this._disposables.push(
			contextService.onDidChangeDocumentContext(context => {
				if (context && isTokenizedDocumentContext(context)) {
					this._onDidChangeDocumentContext(context);
				}
			})
		);
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}

		this._disposables.length = 0;
	}

	/**
	 * Captures the intent to auto-define a prefix when a colon is typed.
	 * The actual processing is deferred until fresh tokens arrive.
	 */
	private _onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent): void {
		const change = e.contentChanges[0];

		if (!change?.text.endsWith(':')) return;

		if (!getConfig().get('prefixes.autoDefinePrefixes')) return;

		// Prefixed names typed in triplate frontmatter (example values) are not tokenized
		// by the language server, so handle them directly rather than waiting for tokens.
		if (this._tryAutoDefineFrontmatterPrefix(e.document, change.range.start)) {
			return;
		}

		this._pendingPrefix = {
			documentUri: e.document.uri.toString(),
			position: change.range.start
		};
	}

	/**
	 * Attempts to auto-define a prefix for a prefixed name typed as an example value in
	 * the triplate frontmatter, e.g. `type: schema:Person`. Returns `true` when the colon
	 * was typed inside the frontmatter (so the token-based path should be skipped).
	 * @param document The text document.
	 * @param position The position at which the colon was typed.
	 */
	private _tryAutoDefineFrontmatterPrefix(document: vscode.TextDocument, position: vscode.Position): boolean {
		const text = document.getText();

		if (!isTemplate(text) || document.offsetAt(position) >= getContentStartOffset(text)) {
			return false;
		}

		// A pname colon appears in a value position, i.e. after a `name:` binding on the
		// same line. The captured group is the prefix immediately before the typed colon.
		const beforeColon = document.lineAt(position.line).text.substring(0, position.character);
		const match = /^\s*[A-Za-z_][\w-]*\s*:\s*([A-Za-z_][\w.-]*)$/.exec(beforeColon);

		if (match) {
			void this._defineFrontmatterPrefix(document, match[1]);
		}

		// The colon was typed in the frontmatter; the token-based path does not apply.
		return true;
	}

	/**
	 * Declares the given prefix in the document body (below the frontmatter) unless it is
	 * already defined.
	 * @param document The text document.
	 * @param prefix The prefix to declare.
	 */
	private async _defineFrontmatterPrefix(document: vscode.TextDocument, prefix: string): Promise<void> {
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.getContext(document, TurtleDocument);

		if (!context || context.namespaces[prefix]) return;

		const service = container.resolve<TurtlePrefixDefinitionService>(ServiceToken.TurtlePrefixDefinitionService);
		const edit = await service.implementPrefixes(document, [{ prefix, namespaceIri: undefined }]);

		if (edit.size > 0) {
			vscode.workspace.applyEdit(edit);
		}
	}

	/**
	 * Processes the pending prefix when fresh tokens arrive from the language server.
	 */
	private async _onDidChangeDocumentContext(context: ITokenizedDocumentContext): Promise<void> {
		const pending = this._pendingPrefix;

		if (!context || !pending || pending.documentUri !== context.uri.toString()) return;

		const document = context.getTextDocument();

		if (!document) return;

		const n = context.getTokenIndexAtPosition(pending.position);

		if (n < 1) return;

		const previousToken = context.tokens[n - 1]?.image.toLowerCase();

		// Do not auto-implement prefixes when manually typing a prefix definition.
		if (previousToken === 'prefix' || previousToken === '@prefix') return;

		// Do not implement prefixes for URI schemes.
		if (previousToken === '<') return;

		const currentToken = context.tokens[n];

		if (currentToken && currentToken.image && currentToken.tokenType.name === RdfToken.PNAME_NS.name) {
			const prefix = currentToken.image.substring(0, currentToken.image.length - 1);

			// Do not implement prefixes that are already defined.
			if (context.namespaces[prefix]) return;

			const service = container.resolve<TurtlePrefixDefinitionService>(ServiceToken.TurtlePrefixDefinitionService);
			const edit = await service.implementPrefixes(document, [{ prefix: prefix, namespaceIri: undefined }]);

			if (edit.size > 0) {
				vscode.workspace.applyEdit(edit);
			}
		}
	}
}
