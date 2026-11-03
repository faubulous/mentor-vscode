import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';

/**
 * The quad contexts of the document of one form editor, read once per parse. Reading them parses
 * the whole document, and both the snapshot and every edit need them, so the session keeps the
 * last ones until the tokens of the document are replaced. Kept by the session, they live only
 * while the editor is open.
 */
export class QuadContextCache {
	private _tokens?: IToken[];

	private _quadContexts: readonly QuadContext[] = [];

	/**
	 * The quad contexts of the current tokens of a document.
	 * @param context The context of the document.
	 * @returns The quad contexts, read again only when the tokens were replaced.
	 */
	get(context: TurtleDocument): readonly QuadContext[] {
		if (this._tokens !== context.tokens) {
			this._quadContexts = context.getQuadContexts();
			this._tokens = context.tokens;
		}

		return this._quadContexts;
	}
}
