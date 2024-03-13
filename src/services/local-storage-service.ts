import { Memento } from "vscode";

/**
 * A service for storing and retrieving data from the local storage.
 */
export class LocalStorageService {
	private _storage: Memento | undefined;

	/**
	 * Initialize the local storage service.
	 * @param memento A memento to use as the local storage.
	 */
	initialize(memento: Memento) {
		this._storage = memento;
	}

	/**
	 * Get a value from the local storage.
	 * @param key Key to retrieve the value from the storage.
	 * @param defaultValue The default value to return if the key is not found in the storage.
	 * @returns Data from the storage, or the default value if the key is not found.
	 */
	getValue<T>(key: string, defaultValue: T): T {
		if (this._storage) {
			return this._storage.get<T>(key, defaultValue);
		} else {
			throw new Error("Storage not initialized.");
		}
	}

	/**
	 * Set a value in the local storage.
	 * @param key Key to store the value in the storage.
	 * @param value Value to store in the storage.
	 */
	setValue<T>(key: string, value: T) {
		if (this._storage) {
			this._storage.update(key, value);
		} else {
			throw new Error("Storage not initialized.");
		}
	}
}