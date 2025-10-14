import { LanguageClientBase } from '@src/languages';

export class SparqlLanguageClient extends LanguageClientBase {
	constructor() {
		super('sparql', 'SPARQL');
	}
}
