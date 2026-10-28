import { StatementRow } from '../line/statement-row';
import { ResourceDetail } from '../form-editor-model';
import { LineOverride } from './line-override';

/**
 * The texts the rows of a card show instead of their lines, by row key. Changes return a new
 * instance, or the same one when nothing changed.
 */
export class LineOverrides {
	/**
	 * No overrides.
	 */
	static readonly NONE = new LineOverrides({});

	/**
	 * Create the overrides.
	 * @param _byKey The overrides by row key.
	 */
	private constructor(private readonly _byKey: Readonly<Record<string, LineOverride>>) { }

	/**
	 * Get the override of a row.
	 * @param key The row key.
	 * @returns The override, or `undefined` when the row shows its line.
	 */
	get(key: string): LineOverride | undefined {
		return this._byKey[key];
	}

	/**
	 * Set the override of a row.
	 * @param key The row key.
	 * @param override The override.
	 * @returns The overrides with it.
	 */
	with(key: string, override: LineOverride): LineOverrides {
		return new LineOverrides({ ...this._byKey, [key]: override });
	}

	/**
	 * Remove the override of a row.
	 * @param key The row key.
	 * @returns The overrides without it, the same instance when there was none.
	 */
	without(key: string): LineOverrides {
		if (!(key in this._byKey)) {
			return this;
		}

		const { [key]: _removed, ...kept } = this._byKey;

		return new LineOverrides(kept);
	}

	/**
	 * Drop the overrides the rows no longer need: of rows that are gone, of submitted texts once
	 * the host delivered the resource again, and of property rows whose text changed since.
	 * @param rows The rows, built without overrides.
	 * @param detail The resource as the rows show it now.
	 * @returns The overrides still needed, the same instance when nothing was dropped.
	 */
	prune(rows: readonly StatementRow[], detail: ResourceDetail): LineOverrides {
		const byKey = new Map(rows.map(row => [row.line.key, row]));
		const kept = Object.entries(this._byKey).filter(([key, override]) => {
			const row = byKey.get(key);

			if (!row || (override.submittedWith !== undefined && override.submittedWith !== detail)) {
				return false;
			}

			return row.source !== 'property' || row.line.text === override.original;
		});

		return kept.length === Object.keys(this._byKey).length ? this : new LineOverrides(Object.fromEntries(kept));
	}
}
