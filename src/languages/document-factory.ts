import * as vscode from 'vscode';
import { DocumentContext } from './document-context';
import { TurtleDocument } from './turtle-document';
import { SparqlDocument } from './sparql-document';

export class DocumentFactory {
	supportedLanguages: string[] = ['ntriples', 'nquads', 'turtle', 'trig', 'sparql'];

	public isSupported(languageId: string): boolean {
		return this.supportedLanguages.includes(languageId);
	}

	public create(document: vscode.TextDocument): DocumentContext {
		if (['ntriples', 'nquads', 'turtle', 'trig'].includes(document.languageId)) {
			return new TurtleDocument(document);
		} else if (document.languageId === 'sparql') {
			return new SparqlDocument(document);
		} else {
			throw new Error('Unsupported language:' + document.languageId);
		}
	}
}