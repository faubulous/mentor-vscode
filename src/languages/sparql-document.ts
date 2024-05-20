import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class SparqlDocument extends DocumentContext {
	protected async parseData(data: string): Promise<TokenizerResult> {
		try {
			return await Tokenizer.parseData(data, RdfSyntax.Sparql);
		} catch (e) {
			console.debug(data);
			console.error(e);

			throw e;
		}
	}
}