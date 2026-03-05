import { NamespaceMap } from '@src/utilities';

/**
 * Interface for the PrefixLookupService.
 */
export interface IPrefixLookupService {
	/**
	 * Get the a namespace map for the standard W3C prefix definitions used in inference graphs.
	 * @returns A map of standard prefixes.
	 */
	getInferencePrefixes(): NamespaceMap;

	/**
	 * Get the default prefixes from the Mentor extension configuration.
	 * @returns A map of default prefixes.
	 */
	getDefaultPrefixes(): NamespaceMap;

	/**
	 * Get the prefix for a given namespace IRI.
	 * @param documentUri The URI of the document where the IRI is used.
	 * @param namespaceIri A namespace IRI to look up.
	 * @param defaultValue A default value to return if the prefix is not found.
	 * @returns A prefix for the given IRI if it is declared in the project. A default value otherwise.
	 */
	getPrefixForIri(documentUri: string, namespaceIri: string, defaultValue: string): string;

	/**
	 * Get the most frequently used URI for a given prefix.
	 * @param documentUri The URI of the document where the prefix is used.
	 * @param prefix A prefix to look up.
	 * @returns A URI for the given prefix if it is declared in the project. An empty string otherwise.
	 */
	getUriForPrefix(documentUri: string, prefix: string): string;
}
