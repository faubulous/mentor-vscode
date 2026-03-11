import * as vscode from 'vscode';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { FileExtensionInfo } from '@src/services/document/document-factory';

/**
 * Interface for the DocumentFactory.
 */
export interface IDocumentFactory {
	/**
	 * The supported languages.
	 */
	readonly supportedLanguages: Set<string>;

	/**
	 * The supported file extensions.
	 */
	readonly supportedExtensions: { [key: string]: FileExtensionInfo };

	/**
	 * Indicates whether a language is a triple source language, meaning that documents in this language can be loaded as RDF triples into the store.
	 * @param languageId The language ID to check (e.g. 'turtle', 'sparql').
	 * @returns `true` if the language is a triple source language, otherwise `false`.
	 */
	isTripleSourceLanguage(languageId: string): boolean;

	/**
	 * Checks if a document can be converted to another format.
	 * @param languageId The language ID of the document.
	 * @returns `true` if the document can be converted, otherwise `false`.
	 */
	isConvertibleLanguage(languageId: string): boolean;

	/**
	 * Checks if a file is supported by the factory.
	 * @param uri The URI of the file.
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	isSupportedFile(uri: vscode.Uri): boolean;

	/**
	 * Checks if a notebook file is supported by Mentor.
	 * @param uri The URI of the notebook file.
	 * @returns `true` if the notebook file is supported, otherwise `false`.
	 */
	isSupportedNotebookFile(uri: vscode.Uri): boolean;

	/**
	 * Checks if a file is supported by the factory.
	 * @param ext The lower-case file extension including the dot (e.g. '.ttl').
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	isSupportedExtension(ext: string): boolean;

	/**
	 * Get the language ID for a file URI.
	 * @param uri The URI of the file.
	 * @returns A language ID if the file is supported, otherwise `undefined`.
	 */
	getDocumentLanguageId(uri: vscode.Uri): string | undefined;

	/**
	 * Loads a document and returns a document context.
	 * @param documentUri A document URI.
	 * @param languageId Optional language ID to use.
	 * @returns A document context.
	 */
	create(documentUri: vscode.Uri, languageId?: string): IDocumentContext;

	/**
	 * Retrieves language information including readable names and icons from package.json.
	 * @returns An array of language information objects.
	 */
	getSupportedLanguagesInfo(): Promise<ILanguageInfo[]>;

	/**
	 * Get language metadata such as the name and extensions from package.json.
	 * @param languageId The language identifier.
	 * @returns A `ILanguageInfo` object if the language is supported by this factory, `undefined` otherwise.
	 */
	getLanguageInfo(languageId: string): Promise<ILanguageInfo | undefined>;

	/**
	 * Retrieves language information from a MIME type.
	 * @param mimetype The MIME type to look up.
	 * @returns The corresponding `ILanguageInfo` object, or `undefined` if not found.
	 */
	getLanguageInfoFromMimeType(mimetype: string): Promise<ILanguageInfo | undefined>;
}

/**
 * Information about a supported programming language.
 */
export interface ILanguageInfo {
	/**
	 * The language identifier, (e.g. 'turtle' or 'sparql').
	 */
	id: string;

	/**
	 * The human-readable name of the language.
	 */
	name: string;

	/**
	 * Get the displayed name of the file type (e.g. 'Turtle Document', 'SPARQL Query').
	 */
	typeName: string;

	/**
	 * The icon associated with the language, if any.
	 */
	icon: string;

	/**
	 * The file extensions associated with the language (e.g. '.ttl', '.sparql').
	 */
	extensions: string[];

	/**
	 * The MIME types associated with the language (e.g. 'text/turtle', 'application/sparql-query').
	 */
	mimetypes: string[];
}