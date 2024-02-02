import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL');
	}

	protected async parse(content: string): Promise<TokenizerResult>{
		return Tokenizer.parseData(content, RdfSyntax.Sparql);
	}
}

new SparqlLanguageServer().start();