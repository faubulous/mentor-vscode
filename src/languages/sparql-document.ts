import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class SparqlDocument extends DocumentContext {
	protected async parseData(data: string): Promise<TokenizerResult> {
		return await Tokenizer.parseData(data, RdfSyntax.Sparql);
	}
}