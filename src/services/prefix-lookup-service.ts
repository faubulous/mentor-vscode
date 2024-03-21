import * as mentor from '../mentor';
import { DEFAULT_PREFIXES } from '../services/prefix-downloader-service';

/**
 * A service for looking up prefixes in the project.
 */
export class PrefixLookupService {
	/**
	 * Get the most frequently used URI for a given prefix.
	 * @param prefix A prefix to look up.
	 * @returns A URI for the given prefix if it is declared in the project. An empty string otherwise.
	 */
	getUriForPrefix(prefix: string): string {
		// Count the number of times each URI is used for the given prefix.
		const uriCounts: { [uri: string]: number } = {};

		for (let document of Object.values(mentor.contexts)) {
			if (document.namespaces[prefix]) {
				const uri = document.namespaces[prefix];

				uriCounts[uri] = (uriCounts[uri] || 0) + 1;
			}
		}

		let result: string | undefined = undefined;
		let maxCount = 0;

		for (let uri in uriCounts) {
			// Return the URI that is used the most for the given prefix in local documents.
			if (uriCounts[uri] > maxCount) {
				maxCount = uriCounts[uri];
				result = uri;
			}
		}

		// Alternatively use the default prefixes if the prefix is not declared in the project.
		const defaultPrefixes = mentor.configuration.get('defaultPrefixes', DEFAULT_PREFIXES).prefixes;

		const uri = result ?? defaultPrefixes[prefix];

		// Returning an empty string will produce empty URI declarations which  will trigger 
		// a diagnostic error in the document so users can enter it manually.
		return uri ?? '';
	}
}