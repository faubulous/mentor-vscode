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
	readonly supportedLanguages: Set<string> = new Set(['ntriples', 'nquads', 'turtle', 'trig', 'sparql']);

	/**
	 * The supported file extensions.
	 */
	readonly supportedExtensions: Set<string> = new Set(['.ttl', '.n3', '.nt', '.nq', '.trig', '.sparql', '.rq']);

	/**
	 * Checks if a file is supported by the factory.
	 * @param uri The URI of the file.
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	public isSupportedFile(uri: vscode.Uri): boolean {
		const extension = path.extname(uri.fsPath).toLowerCase();

		return this.supportedExtensions.has(extension);
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
				case '.rq':
				case '.sparql':
					return new SparqlDocument(documentUri);
				default:
					throw new Error('Unsupported file extension:' + extension);
			}
		}
	}
}