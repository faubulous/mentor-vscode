import * as vscode from 'vscode';
import { MENTOR_EXTENSION_ID } from '../mentor';
import { Utils } from 'vscode-uri';
import { RdfSyntax } from '@faubulous/mentor-rdf';
import { DocumentContext } from './document-context';
import { TurtleDocument, SparqlDocument, XmlDocument } from '../languages';

/**
 * Information about a supported programming language.
 */
export interface LanguageInfo {
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

/**
 * A factory for creating RDF document contexts.
 */
export class DocumentFactory {
	/**
	 * The supported languages.
	 */
	readonly supportedLanguages: Set<string>;

	/**
	 * The supported file extensions.
	 */
	readonly supportedExtensions: { [key: string]: string } = {
		'.ttl': 'turtle',
		'.n3': 'n3',
		'.nt': 'ntriples',
		'.nq': 'nquads',
		'.trig': 'trig',
		'.sparql': 'sparql',
		'.rq': 'sparql',
		'.rdf': 'xml',
		'.mnb': 'json'
	}

	constructor() {
		this.supportedLanguages = new Set(Object.values(this.supportedExtensions));
	}

	/**
	 * Checks if a document can be converted to another format.
	 * @param languageId The language ID of the document.
	 * @returns `true` if the document can be converted, otherwise `false`.
	 */
	isConvertibleLanguage(languageId: string): boolean {
		return languageId === 'ntriples' ||
			languageId === 'nquads' ||
			languageId === 'turtle' ||
			languageId === 'xml';
	}

	/**
	 * Checks if a file is supported by the factory.
	 * @param uri The URI of the file.
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	isSupportedFile(uri: vscode.Uri): boolean {
		return this.getDocumentLanguageId(uri) !== undefined;
	}

	/**
	 * Checks if a file is supported by the factory.
	 * @param ext The lower-case file extension including the dot (e.g. '.ttl').
	 * @returns `true` if the file is supported, otherwise `false`.
	 */
	isSupportedExtension(ext: string): boolean {
		return this.supportedExtensions[ext] !== undefined;
	}

	/**
	 * Get the language ID for a file URI.
	 * @param uri The URI of the file.
	 * @returns A language ID if the file is supported, otherwise `undefined`.
	 */
	getDocumentLanguageId(uri: vscode.Uri): string {
		const extension = Utils.extname(uri).toLowerCase();

		return this.supportedExtensions[extension];
	}

	/**
	 * Loads a document and returns a document context.
	 * @param document A text document.
	 * @returns A document context.
	 */
	create(documentUri: vscode.Uri, languageId?: string): DocumentContext {
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
			case 'n3':
				return new TurtleDocument(documentUri, RdfSyntax.N3);
			case 'trig':
				return new TurtleDocument(documentUri, RdfSyntax.TriG);
			case 'sparql':
				return new SparqlDocument(documentUri);
			case 'xml':
				return new XmlDocument(documentUri);
			default:
				throw new Error('Unsupported language:' + language);
		}
	}

	private _getTypeName(languageId: string, alias?: string): string {
		const name = alias ? alias : languageId;

		switch (languageId) {
			case 'sparql':
				return name + ' Query';
			default:
				return name + ' File';
		}
	}

	private _getIconName(languageId: string): string {
		switch (languageId) {
			case 'sparql':
				return 'sparql-file';
			case 'ntriples':
			case 'nquads':
			case 'n3':
			case 'turtle':
			case 'trig':
			case 'xml':
			case 'json':
				return 'rdf-file';
			default:
				return 'file';
		}
	}

	/**
	 * Retrieves language information including readable names and icons from package.json.
	 * @param factory The DocumentFactory instance.
	 * @returns An array of language information objects.
	 */
	async getSupportedLanguagesInfo(): Promise<LanguageInfo[]> {
		const packageJson = await this._getPackageJson();
		const languageMap = new Map<string, LanguageInfo>();

		for (const language of this.supportedLanguages) {
			languageMap.set(language, {
				id: language,
				name: language, // fallback name
				typeName: this._getTypeName(language),
				icon: this._getIconName(language),
				extensions: [],
				mimetypes: []
			});
		}

		for (const [extension, languageId] of Object.entries(this.supportedExtensions)) {
			const info = languageMap.get(languageId);

			if (info) {
				info.extensions.push(extension);
			}
		}

		if (packageJson?.contributes?.languages) {
			for (const lang of packageJson.contributes.languages) {
				const info = languageMap.get(lang.id);

				if (info) {
					info.name = lang.aliases?.[0] || lang.id;
					info.typeName = this._getTypeName(lang.id, info.name) || lang.id;
					info.icon = this._getIconName(lang.id);

					for (const mimetype of lang.mimetypes || []) {
						info.mimetypes.push(mimetype);
					}
				}
			}
		}

		return Array.from(languageMap.values());
	}

	/**
	 * Get language metadata such as the name and extensions from package.json
	 * @param languageId The language identifier.
	 * @returns A `LanguageInfo` object if the language is supported by this factory, `undefined` otherwise.
	 */
	async getLanguageInfo(languageId: string): Promise<LanguageInfo | undefined> {
		return (await this.getSupportedLanguagesInfo()).find(l => l.id === languageId);
	}

	/**
	 * Retrieves language information from a MIME type.
	 * @param mimetype The MIME type to look up.
	 * @returns The corresponding `LanguageInfo` object, or `undefined` if not found.
	 */
	async getLanguageInfoFromMimeType(mimetype: string): Promise<LanguageInfo | undefined> {
		return (await this.getSupportedLanguagesInfo()).find(l => l.mimetypes.includes(mimetype));
	}

	/**
	 * Helper function to read package.json from the extension.
	 * @returns The parsed package.json content.
	 */
	private async _getPackageJson(): Promise<any> {
		try {
			const extensionPath = vscode.extensions.getExtension(MENTOR_EXTENSION_ID)?.extensionPath;

			if (!extensionPath) {
				throw new Error('Extension path not found');
			}

			const packageJsonUri = vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'package.json');
			const buffer = await vscode.workspace.fs.readFile(packageJsonUri);
			const content = new TextDecoder().decode(buffer);

			return JSON.parse(content);
		} catch (error) {
			console.warn('Could not read package.json:', error);
			return null;
		}
	}
}