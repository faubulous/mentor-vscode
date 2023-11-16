import * as path from 'path';
import { LanguageClientBase } from './language-client';

export class SparqlLanguageClient extends LanguageClientBase {
	get serverPath(): string {
		return path.join('out', 'language-server-sparql.js');
	}

	constructor() {
		super('sparql', 'SPARQL');
	}
}
