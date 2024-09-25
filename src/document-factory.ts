import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
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
	readonly supportedExtensions: { [key: string]: string } = {
		'.ttl': 'turtle',
		'.n3': 'ntriples',
		'.nt': 'ntriples',
		'.nq': 'nquads',
		'.trig': 'trig',
		'.sparql': 'sparql',
		'.rq': 'sparql'
	}

	/**
	 * Checks if a file is supported by the factory.
	 * @param uri The URI of the file.
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	public isSupportedFile(uri: vscode.Uri): boolean {
		return this.getDocumentLanguageId(uri) !== undefined;
	}

	/**
	 * Checks if a file is supported by the factory.
	 * @param ext The lower-case file extension including the dot (e.g. '.ttl').
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	public isSupportedExtension(ext: string): boolean {
		return this.supportedExtensions[ext] !== undefined;
	}

	/**
	 * Get the language ID for a file URI.
	 * @param uri The URI of the file.
	 * @returns A language ID if the file is supported, otherwise `undefined`.
	 */
	public getDocumentLanguageId(uri: vscode.Uri): string {
		const extension = Utils.extname(uri).toLowerCase();

		return this.supportedExtensions[extension];
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
		let language = languageId ?? this.getDocumentLanguageId(documentUri);

		if (!language) {
			throw new Error('Unable to determine the document language: ' + documentUri.toString());
		}

		switch (language) {
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
				throw new Error('Unsupported language:' + language);
		}
	}
}