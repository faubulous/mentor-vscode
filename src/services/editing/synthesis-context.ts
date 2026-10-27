import { IToken, QuadContext, RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { LocalStyle, StyleFallback } from './local-style';
import { LocalStyleDetector } from './local-style-detector';
import { StatementModel } from './statement-model';
import { TermWriter } from './term-writer';

/**
 * Everything the edit synthesis needs to know about a document. Free of VS Code types so that
 * plans can be computed and tested on plain strings.
 */
export interface SynthesisInput {
	/**
	 * The text of the document.
	 */
	text: string;

	/**
	 * The tokens of the text, including comment tokens.
	 */
	tokens: IToken[];

	/**
	 * The quad contexts read from the tokens.
	 */
	quadContexts: QuadContext[];

	/**
	 * Prefix to namespace IRI, as declared in the document.
	 */
	namespaces: Record<string, string>;

	/**
	 * The syntax of the document.
	 */
	syntax: RdfSyntax;

	/**
	 * The editor settings the style of the document falls back to.
	 */
	style: StyleFallback;
}

/**
 * The state shared by the operations of one user action.
 */
export interface SynthesisContext {
	/**
	 * The document the action edits.
	 */
	input: SynthesisInput;

	/**
	 * The statement model of the document.
	 */
	model: StatementModel;

	/**
	 * The style of the document.
	 */
	style: LocalStyle;

	/**
	 * Tells the indentation of the blocks and groups of the document.
	 */
	styleDetector: LocalStyleDetector;

	/**
	 * Writes terms the way the document writes them.
	 */
	writer: TermWriter;

	/**
	 * Prefix to namespace IRI: the declarations of the document and those the action adds.
	 */
	namespaces: Record<string, string>;
}
