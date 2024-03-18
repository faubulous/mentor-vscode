import * as mentor from '../mentor';
import { DEFAULT_PREFIXES } from '../services/prefix-downloader-service';

/**
 * A service for looking up prefixes in the project.
 */
export class PrefixLookupService {
	/**
	 * Get the most frequently used URI for a given prefix.
	 * @param prefix A prefix to look up.
	 * @returns A URI for the given prefix if it is declared in the project. `undefined` otherwise.
	 */
	getUriForPrefix(prefix: string): string | undefined {
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
			if (uriCounts[uri] > maxCount) {
				maxCount = uriCounts[uri];
				result = uri;
			}
		}

		const defaultPrefixes = mentor.configuration.get('defaultPrefixes', DEFAULT_PREFIXES).prefixes;

		return result ?? defaultPrefixes[prefix];
	}
}