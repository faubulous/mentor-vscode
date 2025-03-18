import { LanguageClientBase } from '@/languages';

export class SparqlLanguageClient extends LanguageClientBase {
	constructor() {
		super('sparql', 'SPARQL');
	}
}
