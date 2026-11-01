import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';

/**
 * The statements of the document a form editor shows, read once per parse: the snapshot and the
 * edits made against it read the same statements, and reading them parses the whole document,
 * which takes a noticeable time for a large one. Kept by the editor, so a document no form editor
 * shows keeps none.
 */
export class FormEditorQuadContexts {
	private _read?: { tokens: IToken[]; quadContexts: QuadContext[] };

	/**
	 * Get the statements of the current parse of a document.
	 * @param context The context of the document.
	 * @returns The statements with their source tokens, as a copy a caller may rearrange.
	 */
	of(context: TurtleDocument): QuadContext[] {
		if (this._read?.tokens !== context.tokens) {
			this._read = { tokens: context.tokens, quadContexts: context.getQuadContexts() };
		}

		return [...this._read.quadContexts];
	}
}
