import { TokenizerResult, SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		const parser = new SparqlSyntaxParser();

		const { errors, semanticErrors, comments } = parser.parse(content);
		const tokens = [...parser.input, ...comments];

		return { tokens, syntaxErrors: errors, semanticErrors };
	}
}

new SparqlLanguageServer().start();