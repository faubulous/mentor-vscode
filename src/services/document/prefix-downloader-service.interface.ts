import { PrefixDefinitions } from '@src/services/document/prefix-downloader-service';

/**
 * Interface for the PrefixDownloaderService.
 */
export interface IPrefixDownloaderService {
	/**
	 * The URL of the endpoint to download prefixes from.
	 */
	readonly endpointUrl: string;

	/**
	 * Retrieve a dictionary of prefixes and their URIs from the web.
	 * @returns A promise that resolves to a dictionary of prefixes and their URIs.
	 */
	fetchPrefixes(): Promise<PrefixDefinitions>;
}
