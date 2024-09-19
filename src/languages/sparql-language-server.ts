import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase, TokenizationResults } from './language-server';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL');
	}

	protected async parse(content: string): Promise<TokenizationResults> {
		const parser = new SparqlSyntaxParser();

		const { errors, semanticErrors, comments } = parser.parse(content);
		const tokens = [...parser.input, ...comments];

		return { tokens, errors, semanticErrors, comments };
	}
}

new SparqlLanguageServer().start();