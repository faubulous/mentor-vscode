import { IToken, QuadContext, RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { LocalStyle, StyleFallback } from './local-style-detector';
import { StatementModel } from './statement-model';
import { TermWriter } from './term-writer';

/**
 * Everything the edit synthesis needs to know about a document. Free of VS Code types so that
 * plans can be computed and tested on plain strings.
 */
export interface SynthesisInput {
	text: string;
	tokens: IToken[];
	quadContexts: QuadContext[];
	/** Prefix to namespace IRI, as declared in the document. */
	namespaces: Record<string, string>;
	syntax: RdfSyntax;
	style: StyleFallback;
}

/**
 * The state shared by the operations of one user action.
 */
export interface SynthesisContext {
	input: SynthesisInput;
	model: StatementModel;
	style: LocalStyle;
	writer: TermWriter;
	/** Prefix to namespace IRI: the declarations of the document and those the action adds. */
	namespaces: Record<string, string>;
}
