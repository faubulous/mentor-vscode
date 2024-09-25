import * as vscode from 'vscode';
import { EventEmitter } from 'events'

/**
 * Supported label styles of the definition tree.
 */
export enum TreeLabelStyle {
	/**
	 * Show the labels that are annotated with predicate such as `rdfs:label`.
	 */
	AnnotatedLabels,
	/**
	 * Show the local parts of the URI as labels.
	 */
	UriLabels,
	/**
	 * Show the local parts of the URI as labels with the prefix defined in the document.
	 */
	UriLabelsWithPrefix
};

/**
 * Supported layout types of the definition tree.
 */
export enum DefinitionTreeLayout {
	/**
	 * Shows all resources in a document grouped by type regardless of their definition source.
	 */
	ByType,
	/**
	 * Shows all resources in a document grouped by their definition source and then by type.
	 */
	BySource
};

/**
 * An API for the configuration settings of the Mentor extension.
 */
export class Settings extends EventEmitter {
	private _data: { [key: string]: any } = {};

	readonly _onDidChange = new vscode.EventEmitter<{ key: string, oldValue: any, newValue: any }>();

	onDidChange(key: string, callback: (e: { key: string, oldValue: any, newValue: any }) => void) {
		this._onDidChange.event((e) => {
			if (e.key == key) {
				callback(e);
			}
		});
	}

	/**
	 * Return a value from this configuration.
	 * @param key Configuration variable name, supports _dotted_ names.
	 * @param defaultValue A value should be returned when no value could be found, is `undefined`.
	 * @returns The value `section` denotes or the default.
	 */
	get<T>(key: string, defaultValue?: T): T | undefined {
		return this._data[key] ?? defaultValue;
	}

	/**
	 * Set a value in this configuration.
	 * @param key Configuration variable name, supports _dotted_ names.
	 * @param value The value to be set for the configuration variable.
	 */
	set<T>(key: string, value: T) {
		let oldValue = this._data[key];

		if (oldValue != value) {
			this._data[key] = value;

			vscode.commands.executeCommand('setContext', key, value);

			this._onDidChange.fire({ key: key, oldValue: oldValue, newValue: value });
		}
	}

	/**
	 * Check if this configuration has a certain value.
	 *
	 * @param key Configuration name, supports _dotted_ names.
	 * @returns `true` if the section doesn't resolve to `undefined`.
	 */
	has(key: string): boolean {
		return this._data[key] != null;
	}
}