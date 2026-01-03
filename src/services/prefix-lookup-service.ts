import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { NamespaceMap } from '@src/utilities';
import { DEFAULT_PREFIXES } from '@src/services';
import { WorkspaceUri } from '@src/workspace/workspace-uri';

/**
 * A service for looking up prefixes in the project.
 */
export class PrefixLookupService {
	/**
	 * Get the a namespace map for the standard W3C prefix definitions used in inference graphs.
	 * @returns A map of standard prefixes.
	 */
	getInferencePrefixes(): NamespaceMap {
		return {
			'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
			'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
			'owl': 'http://www.w3.org/2002/07/owl#',
			'skos': 'http://www.w3.org/2004/02/skos/core#',
			'shacl': 'http://www.w3.org/ns/shacl#'
		}
	}

	/**
	 * Get the default prefixes from the Mentor extension configuration.
	 * @returns A map of default prefixes.
	 */
	getDefaultPrefixes(): NamespaceMap {
		return mentor.globalStorage.getValue('defaultPrefixes', DEFAULT_PREFIXES).prefixes;
	}

	/**
	 * Get the prefix for a given namespace IRI.
	 * @param documentUri The URI of the document where the IRI is used.
	 * @param namespaceIri A namespace IRI to look up.
	 * @param defaultValue A default value to return if the prefix is not found.
	 * @returns A prefix for the given IRI if it is declared in the project. A default value otherwise.
	 */
	getPrefixForIri(documentUri: string, namespaceIri: string, defaultValue: string) {
		// 1. Try to find the prefix in the document.
		const documentContext = mentor.contexts[documentUri];

		if (documentContext) {
			for (const [prefix, iri] of Object.entries(documentContext.namespaces)) {
				if (iri === namespaceIri) {
					return prefix;
				}
			}
		}

		// 2. Try to find the prefix in the project configuration.
		const projectPrefixes = mentor.configuration.get<{ defaultPrefix: string, uri: string }[]>('namespaces');

		if (Array.isArray(projectPrefixes)) {
			const prefix = projectPrefixes.find(namespace => namespace.uri === namespaceIri)?.defaultPrefix;

			if (prefix) {
				return prefix;
			}
		}

		// 3. Try to find the prefix in any of the other documents in the workspace.
		for (const context of Object.values(mentor.contexts)) {
			for (const [prefix, iri] of Object.entries(context.namespaces)) {
				if (iri === namespaceIri) {
					return prefix;
				}
			}
		}

		// 4. Try to find the prefix in the default prefixes.
		const defaultPrefixes = this.getDefaultPrefixes();

		for (const prefix in defaultPrefixes) {
			if (defaultPrefixes[prefix] === namespaceIri) {
				return prefix;
			}
		}

		return defaultValue;
	}

	/**
	 * Get the most frequently used URI for a given prefix.
	 * @param documentUri The URI of the document where the prefix is used.
	 * @param prefix A prefix to look up.
	 * @returns A URI for the given prefix if it is declared in the project. An empty string otherwise.
	 */
	getUriForPrefix(documentUri: string, prefix: string): string {
		// The empty prefix is specific for the document and should not be resolved.
		if (prefix === '') {
			let uri = documentUri;

			if (documentUri.startsWith('file') || documentUri.startsWith('vscode-notebook-cell')) {
				// Make file: URIs workspace relative
				const workspaceUri = WorkspaceUri.toWorkspaceUri(vscode.Uri.parse(documentUri));

				if (workspaceUri) {
					uri = workspaceUri.toString();
				}
			}

			if (uri.includes('#')) {
				const param = mentor.configuration.get<string>('prefixes.queryParameterName');

				return uri + '?' + param + '=';
			} else if (uri.endsWith('#')) {
				return uri + '#';
			} else {
				return uri;
			}
		}

		let result: string | undefined = undefined;

		// 1. Check if the prefix is declared in the project configuration as a default prefix.
		const namespaces = mentor.configuration.get<{ defaultPrefix: string, uri: string }[]>('namespaces');

		if (Array.isArray(namespaces)) {
			result = namespaces.find(namespace => namespace.defaultPrefix === prefix)?.uri;

			if (result) {
				return result;
			}
		}

		// 2. Retrieve prefixes from declared in the documents of the workspace.
		// Count the number of times each URI is used for the given prefix.
		const uriCounts: { [uri: string]: number } = {};

		for (let document of Object.values(mentor.contexts)) {
			if (document.namespaces[prefix]) {
				const uri = document.namespaces[prefix];

				uriCounts[uri] = (uriCounts[uri] || 0) + 1;
			}
		}

		let maxCount = 0;

		for (let uri in uriCounts) {
			// Return the URI that is used the most for the given prefix in local documents.
			if (uriCounts[uri] > maxCount) {
				maxCount = uriCounts[uri];
				result = uri;
			}
		}

		if (result) {
			return result;
		}

		// 3. Alternatively use the default prefixes if the prefix is not declared in the project.
		const defaultPrefixes = this.getDefaultPrefixes();

		// Returning an empty string will produce empty URI declarations which  will trigger 
		// a diagnostic error in the document so users can enter it manually.
		return defaultPrefixes[prefix] ?? '';
	}
}