import { ResourceDetail, ResourceId } from '../form-editor-model';
import { ResourceDataProvider } from './resource-data-provider';

/**
 * The maximum number of resources asked for in one message.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Serves resource detail over the webview message channel. Requests are coalesced into one
 * message per frame so that scrolling does not produce a message per row, and the cache is
 * dropped whenever a new document version arrives because blank node identifiers are only valid
 * within the version they were built from.
 */
export class MessagingDataProvider implements ResourceDataProvider {
	private readonly _loaded = new Map<ResourceId, ResourceDetail>();

	private readonly _stale = new Map<ResourceId, ResourceDetail>();

	private readonly _listeners = new Set<() => void>();

	private readonly _pending = new Set<ResourceId>();

	private readonly _requested = new Set<ResourceId>();

	private _version = -1;

	private _flushHandle: number | undefined;

	/**
	 * Create a provider over the message channel.
	 * @param _send Posts a request for the given resources to the extension host.
	 */
	constructor(private readonly _send: (ids: ResourceId[]) => void) { }

	/**
	 * The document version the loaded detail belongs to.
	 * @returns The version.
	 */
	get version(): number {
		return this._version;
	}

	get(id: ResourceId): ResourceDetail | undefined {
		return this._loaded.get(id);
	}

	getStale(id: ResourceId): ResourceDetail | undefined {
		return this._stale.get(id);
	}

	request(ids: ResourceId[]): void {
		let added = false;

		for (const id of ids) {
			if (!this._loaded.has(id) && !this._requested.has(id) && !this._pending.has(id)) {
				this._pending.add(id);
				added = true;
			}
		}

		if (added) {
			this._scheduleFlush();
		}
	}

	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	/**
	 * Accept the detail delivered for a document version, ignoring anything that belongs to a
	 * version that has since been superseded.
	 * @param version The document version the detail was built from.
	 * @param resources The delivered detail.
	 * @param missing Resources the host could not resolve.
	 */
	accept(version: number, resources: ResourceDetail[], missing: ResourceId[] = []): void {
		if (version !== this._version) {
			return;
		}

		for (const resource of resources) {
			this._loaded.set(resource.id, resource);
			this._stale.delete(resource.id);
			this._requested.delete(resource.id);
		}

		for (const id of missing) {
			this._requested.delete(id);
		}

		if (resources.length > 0) {
			this._notify();
		}
	}

	/**
	 * Move to a new document version. What was loaded for the previous one is kept as stale
	 * detail until the new detail arrives, so the rows of an open card do not vanish during the
	 * reload that follows every edit.
	 * @param version The new document version.
	 */
	setVersion(version: number): void {
		if (version === this._version) {
			return;
		}

		this._version = version;

		for (const [id, detail] of this._loaded) {
			this._stale.set(id, detail);
		}

		this._loaded.clear();
		this._requested.clear();
		this._pending.clear();
		this._notify();
	}

	/**
	 * Batch the pending requests into one message on the next frame.
	 */
	private _scheduleFlush(): void {
		if (this._flushHandle !== undefined) {
			return;
		}

		const schedule = typeof requestAnimationFrame === 'function'
			? requestAnimationFrame
			: (callback: () => void) => setTimeout(callback, 0) as unknown as number;

		this._flushHandle = schedule(() => {
			this._flushHandle = undefined;
			this._flush();
		}) as unknown as number;
	}

	/**
	 * Send the pending requests, one batch at a time.
	 */
	private _flush(): void {
		if (this._pending.size === 0) {
			return;
		}

		const ids = Array.from(this._pending).slice(0, MAX_BATCH_SIZE);

		for (const id of ids) {
			this._pending.delete(id);
			this._requested.add(id);
		}

		this._send(ids);

		if (this._pending.size > 0) {
			this._scheduleFlush();
		}
	}

	/**
	 * Notify the subscribers that loaded data changed.
	 */
	private _notify(): void {
		for (const listener of this._listeners) {
			listener();
		}
	}
}
