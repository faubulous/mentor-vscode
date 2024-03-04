import * as vscode from 'vscode';
import * as path from 'path';
import { DocumentContext } from './document-context';
import { TurtleDocument } from './languages/turtle-document';
import { SparqlDocument } from './languages/sparql-document';
import { RdfSyntax } from '@faubulous/mentor-rdf';

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
		switch (document.languageId) {
			case 'ntriples':
				return new TurtleDocument(document, RdfSyntax.NTriples);
			case 'nquads':
				return new TurtleDocument(document, RdfSyntax.NQuads);
			case 'turtle':
				return new TurtleDocument(document, RdfSyntax.Turtle);
			case 'trig':
				return new TurtleDocument(document, RdfSyntax.TriG);
			case 'sparql':
				return new SparqlDocument(document);
			default:
				throw new Error('Unsupported language:' + document.languageId);
		}
	}
}