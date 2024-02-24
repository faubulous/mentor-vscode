import * as vscode from 'vscode';
import { DocumentContext } from './document-context';
import { TurtleDocument } from './turtle-document';
import { SparqlDocument } from './sparql-document';

/**
 * A factory for creating RDF document contexts.
 */
export class DocumentFactory {
	/**
	 * The supported languages.
	 */
	supportedLanguages: string[] = ['ntriples', 'nquads', 'turtle', 'trig', 'sparql'];

	/**
	 * Indicates if the given language is supported.
	 * @param languageId The language ID.
	 * @returns <code>true</code> if the language is supported, <code>false</code> otherwise.
	 */
	public isSupported(languageId: string): boolean {
		return this.supportedLanguages.includes(languageId);
	}

	/**
	 * Loads a document and returns a document context.
	 * @param document A text document.
	 * @returns A document context.
	 */
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