import * as vscode from 'vscode';
import { EventEmitter } from 'events'

export enum TreeLabelStyle { AnnotatedLabels, UriLabels, UriLabelsWithPrefix };

export enum DefinitionTreeLayout { ByType, BySource };

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