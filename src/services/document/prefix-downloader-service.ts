import defaultPrefixes from './default-prefixes.json';

export interface PrefixDefinitions {
	/**
	 * The date the prefixes were last updated.
	 */
	lastUpdated: Date | undefined;

	/**
	 * A dictionary of prefixes and their URIs.
	 */
	prefixes: { [key: string]: string };
}

/**
 * A service that downloads prefixes from the web.
 */
export class PrefixDownloaderService {
	/**
	 * The URL of the endpoint to download prefixes from.
	 */
	readonly endpointUrl = 'https://prefix.cc/context';

	/**
	 * Retrieve a dictionary of prefixes and their URIs from the web.
	 * @returns A promise that resolves to a dictionary of prefixes and their URIs.
	 */
	async fetchPrefixes(): Promise<PrefixDefinitions> {
		const response = await fetch(this.endpointUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch prefixes: ${response.statusText}`);
		}

		const data = await response.json();

		return {
			lastUpdated: new Date(),
			prefixes: data['@context']
		};
	}
}

export const DEFAULT_PREFIXES: PrefixDefinitions = {
	lastUpdated: undefined,
	prefixes: defaultPrefixes.prefixes
};
