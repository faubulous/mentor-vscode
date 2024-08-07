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
	public create(documentUri: vscode.Uri, languageId?: string): DocumentContext {
		// If the language ID is provided, use it to create the document context
		// as this is more reliable than the file extension. For unsaved documents,
		// the file extension is not available.
		if (languageId) {
			switch (languageId) {
				case 'turtle':
					return new TurtleDocument(documentUri, RdfSyntax.Turtle);
				case 'ntriples':
					return new TurtleDocument(documentUri, RdfSyntax.NTriples);
				case 'nquads':
					return new TurtleDocument(documentUri, RdfSyntax.NQuads);
				case 'trig':
					return new TurtleDocument(documentUri, RdfSyntax.TriG);
				case 'sparql':
					return new SparqlDocument(documentUri);
				default:
					throw new Error('Unsupported language:' + languageId);
			}
		} else {
			const extension = path.extname(documentUri.fsPath).toLowerCase();

			switch (extension) {
				case '.ttl':
					return new TurtleDocument(documentUri, RdfSyntax.Turtle);
				case '.n3':
				case '.nt':
					return new TurtleDocument(documentUri, RdfSyntax.NTriples);
				case '.nq':
					return new TurtleDocument(documentUri, RdfSyntax.NQuads);
				case '.trig':
					return new TurtleDocument(documentUri, RdfSyntax.TriG);
				case '.rw':
				case '.sparql':
					return new SparqlDocument(documentUri);
				default:
					throw new Error('Unsupported file extension:' + extension);
			}
		}
	}
}