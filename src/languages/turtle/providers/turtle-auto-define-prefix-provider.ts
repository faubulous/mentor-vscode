import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';
import { getConfig } from '@src/utilities/vscode/config';
import { getContentStartOffset, getTokenIndexAtPosition } from '@src/utilities';
import { isTemplate } from 'triplate';
import { isTokenizedDocumentContext } from '@src/services/document/document-context.interface';

/**
 * A provider that automatically defines namespace prefixes when a colon is typed
 * in a prefixed name. Detection runs synchronously on the keystroke: the document
 * is tokenized locally (no language-server round-trip) and the prefix declaration
 * is inserted immediately.
 */
export class TurtleAutoDefinePrefixProvider implements vscode.Disposable {
	private readonly _disposables: vscode.Disposable[] = [];

	private readonly _contextService: IDocumentContextService;

	constructor(languages: string[], private readonly _prefixService: TurtlePrefixDefinitionService) {
		const filter = languages.map(language => ({ language }));

		this._contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		this._disposables.push(
			vscode.workspace.onDidChangeTextDocument(e => {
				if (!filter.some(f => f.language === e.document.languageId)) return;

				this._onDidChangeTextDocument(e);
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
	 * Auto-defines a prefix when a colon is typed in a prefixed name. Runs synchronously
	 * by tokenizing the document locally.
	 */
	private _onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent): void {
		const change = e.contentChanges[0];

		if (!change?.text.endsWith(':')) return;

		if (!getConfig().get('prefixes.autoDefinePrefixes')) return;

		// Prefixed names typed in triplate frontmatter (example values) are not tokenized
		// by the RDF lexer, so handle them directly rather than via the token-based path.
		if (this._tryAutoDefineFrontmatterPrefix(e.document, change.range.start)) {
			return;
		}

		void this._tryAutoDefineBodyPrefix(e.document, change.range.start);
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
		const context = this._contextService.getContextFromUri(document.uri.toString());

		if (!context || context.namespaces[prefix]) return;

		const edit = await this._prefixService.implementPrefixes(document, [{ prefix, namespaceIri: undefined }]);

		if (edit.size > 0) {
			vscode.workspace.applyEdit(edit);
		}
	}

	/**
	 * Auto-defines a prefix for a prefixed name typed in the document body by tokenizing
	 * the current text locally and inspecting the token at the typed colon.
	 * @param document The text document.
	 * @param position The position at which the colon was typed.
	 */
	private async _tryAutoDefineBodyPrefix(document: vscode.TextDocument, position: vscode.Position): Promise<void> {
		const context = this._contextService.getContextFromUri(document.uri.toString());

		if (!context || !isTokenizedDocumentContext(context)) {
			return;
		}

		const tokens = context.tokenize(document.getText());
		const n = getTokenIndexAtPosition(tokens, position);

		if (n > 0) {
			const previousToken = tokens[n - 1];

			switch (previousToken.tokenType.name) {
				// Do not auto-implement prefixes when manually typing a prefix definition.
				case RdfToken.PREFIX.name:
				case RdfToken.TTL_PREFIX.name:
				// Do not implement prefixes for URI schemes, starting with <.
				case RdfToken.IRIREF.name:
					return;
			}
		}

		const currentToken = tokens[n];

		if (currentToken && currentToken.image && currentToken.tokenType.name === RdfToken.PNAME_NS.name) {
			const prefix = currentToken.image.substring(0, currentToken.image.length - 1);

			// Do not implement prefixes that are already defined.
			if (context.namespaces[prefix]) {
				return;
			}

			const edit = await this._prefixService.implementPrefixes(document, [{ prefix, namespaceIri: undefined }]);

			if (edit.size > 0) {
				vscode.workspace.applyEdit(edit);
			}
		}
	}
}
