import * as vscode from 'vscode';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { IDocumentTokenSource } from '@src/services/document/document-token-source.interface';
import { EditOperation, EditRejectionReason } from '@src/services/editing/edit-operation';
import { isEditRejection } from '@src/services/editing/edit-rejection';
import { EditSynthesizer } from '@src/services/editing/edit-synthesizer';
import { EditVerifier } from '@src/services/editing/edit-verifier';
import { StyleFallback } from '@src/services/editing/local-style';
import { SynthesisInput } from '@src/services/editing/synthesis-context';
import { getConfig } from '@src/utilities/vscode/config';
import { toWorkspaceEdit } from '@src/utilities/vscode/edit';
import { getFormReadOnlyReason } from './form-editor-read-only';

/**
 * An edit request as received from the webview.
 */
export interface EditRequest {
	/**
	 * The identifier the webview gave the edit, echoed in the answer.
	 */
	editId: string;

	/**
	 * The document version the operations were built against.
	 */
	baseVersion: number;

	/**
	 * The operations of one user action.
	 */
	operations: EditOperation[];
}

/**
 * What the handler needs to carry out a request.
 */
export interface EditHandlerContext {
	/**
	 * The document being edited.
	 */
	document: vscode.TextDocument;

	/**
	 * The context of the document.
	 */
	context: TurtleDocument;

	/**
	 * Re-parses the document synchronously after the edit; the context is parsed directly when
	 * absent.
	 */
	tokenSource?: IDocumentTokenSource;
}

/**
 * The outcome of an edit request.
 */
export type EditOutcome =
	| { ok: true; version: number }
	| { ok: false; reason: EditRejectionReason; message: string };

/**
 * Carries an edit request from the webview through synthesis, verification and application, and
 * re-parses the document right away so the form never waits for the debounced parse. Every
 * request is applied as one workspace edit, so it is one undo step.
 */
export class FormEditorEditHandler {
	/**
	 * Apply an edit request.
	 * @param request The request from the webview.
	 * @param handlerContext The document and its context.
	 * @returns The outcome of the request.
	 */
	async handle(request: EditRequest, handlerContext: EditHandlerContext): Promise<EditOutcome> {
		const { document, context } = handlerContext;

		if (request.baseVersion !== document.version) {
			return _reject('staleVersion', 'The document changed before the edit was applied.');
		}

		const text = document.getText();

		this._ensureFreshTokens(handlerContext, text);

		// Decided on the parse of the text the edit is applied to, not on the diagnostics, which
		// may still describe an earlier text.
		const readOnly = getFormReadOnlyReason(text, context.getSyntaxErrors(text));

		if (readOnly) {
			return _reject(readOnly.reason === 'syntaxErrors' ? 'parseErrors' : 'readOnly', readOnly.message);
		}

		const input: SynthesisInput = {
			text,
			tokens: context.tokens,
			quadContexts: context.getQuadContexts(),
			namespaces: context.namespaces,
			syntax: context.syntax,
			style: _styleFallback(document)
		};
		const plan = new EditSynthesizer(input).synthesize(request.operations);

		if (isEditRejection(plan)) {
			return _reject(plan.reason, plan.message);
		}

		const verification = new EditVerifier(input).verify(plan);

		if (!verification.ok) {
			return _reject('verificationFailed', verification.message);
		}

		if (document.version !== request.baseVersion) {
			return _reject('staleVersion', 'The document changed while the edit was prepared.');
		}

		const applied = await vscode.workspace.applyEdit(toWorkspaceEdit(document, plan.edits));

		if (!applied) {
			return _reject('applyFailed', 'VS Code did not apply the edit.');
		}

		if (document.getText() !== verification.text) {
			return _reject('applyFailed', 'The document changed while the edit was applied.');
		}

		this._refreshTokens(handlerContext, verification.text);

		return { ok: true, version: document.version };
	}

	/**
	 * Make sure the context tokens belong to the current text, which they do not while the
	 * debounced parse of a recent keystroke is still pending.
	 * @param handlerContext The document and its context.
	 * @param text The current text of the document.
	 */
	private _ensureFreshTokens(handlerContext: EditHandlerContext, text: string): void {
		if (!handlerContext.context.getParseResult(text)) {
			this._refreshTokens(handlerContext, text);
		}
	}

	/**
	 * Re-parse the document now, through the token source when there is one so the triple store
	 * follows, or directly on the context otherwise.
	 * @param handlerContext The document and its context.
	 * @param text The text to parse.
	 */
	private _refreshTokens(handlerContext: EditHandlerContext, text: string): void {
		const { document, context, tokenSource } = handlerContext;

		if (!tokenSource?.refreshTokens(document.uri.toString())) {
			context.parse(text);
		}
	}
}

/**
 * Build a rejection outcome.
 * @param reason Why the edit was not applied.
 * @param message The explanation shown to the user.
 * @returns The outcome.
 */
function _reject(reason: EditRejectionReason, message: string): EditOutcome {
	return { ok: false, reason, message };
}

/**
 * Read the editor settings that decide how inserted text is indented when the document gives no
 * hint of its own.
 * @param document The document being edited.
 * @returns The style fallback.
 */
function _styleFallback(document: vscode.TextDocument): StyleFallback {
	const configuration = vscode.workspace.getConfiguration('editor', document.uri);
	const tabSize = Number(configuration?.get?.('tabSize') ?? 4);

	return {
		tabSize: Number.isFinite(tabSize) && tabSize > 0 ? tabSize : 4,
		insertSpaces: configuration?.get?.('insertSpaces') !== false,
		eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
		sortPrefixes: getConfig().get<string>('prefixes.prefixDefinitionMode') !== 'Append'
	};
}
