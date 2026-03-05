/**
 * Interface for the LocalStorageService.
 */
export interface ILocalStorageService {
	/**
	 * Get a value from the local storage.
	 * @param key Key to retrieve the value from the storage.
	 * @param defaultValue The default value to return if the key is not found in the storage.
	 * @returns Data from the storage, or the default value if the key is not found.
	 */
	getValue<T>(key: string, defaultValue: T): T;

	/**
	 * Set a value in the local storage.
	 * @param key Key to store the value in the storage.
	 * @param value Value to store in the storage.
	 */
	setValue<T>(key: string, value: T): Promise<void>;
}
