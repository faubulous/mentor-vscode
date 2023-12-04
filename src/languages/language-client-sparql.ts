import { LanguageClientBase } from './language-client';

export class SparqlLanguageClient extends LanguageClientBase {
	constructor() {
		super('sparql', 'SPARQL');
	}
}
