import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceDetail } from '../form-editor-model';
import { IResourceDataService } from './resource-data-service.interface';

/**
 * The maximum number of resources asked for in one message.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Serves resource detail over the webview message channel. Requests are coalesced into one
 * message per frame so that scrolling does not produce a message per row. The detail is cached by
 * the `termToString` key of the resource, and is kept as stale when a new document version arrives
 * until the detail of that version is loaded.
 */
export class ResourceDataService implements IResourceDataService {
	private readonly _loaded = new Map<string, ResourceDetail>();

	private readonly _stale = new Map<string, ResourceDetail>();

	private readonly _listeners = new Set<() => void>();

	private readonly _pending = new Map<string, NamedNode | BlankNode>();

	private readonly _requested = new Set<string>();

	private _version = -1;

	private _flushHandle: number | undefined;

	/**
	 * Create the service over the message channel.
	 * @param _send Posts a request for the given resources to the extension host.
	 */
	constructor(private readonly _send: (resources: (NamedNode | BlankNode)[]) => void) { }

	/**
	 * The document version the loaded detail belongs to.
	 * @returns The version.
	 */
	get version(): number {
		return this._version;
	}

	get(resource: NamedNode | BlankNode): ResourceDetail | undefined {
		return this._loaded.get(termToString(resource));
	}

	getStale(resource: NamedNode | BlankNode): ResourceDetail | undefined {
		return this._stale.get(termToString(resource));
	}

	request(resources: (NamedNode | BlankNode)[]): void {
		let added = false;

		for (const resource of resources) {
			const key = termToString(resource);

			if (!this._loaded.has(key) && !this._requested.has(key) && !this._pending.has(key)) {
				this._pending.set(key, resource);
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
	accept(version: number, resources: ResourceDetail[], missing: (NamedNode | BlankNode)[] = []): void {
		if (version !== this._version) {
			return;
		}

		for (const resource of resources) {
			const key = termToString(resource.term);

			this._loaded.set(key, resource);
			this._stale.delete(key);
			this._requested.delete(key);
		}

		for (const resource of missing) {
			this._requested.delete(termToString(resource));
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

		for (const [key, detail] of this._loaded) {
			this._stale.set(key, detail);
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

		const batch = Array.from(this._pending).slice(0, MAX_BATCH_SIZE);

		for (const [key] of batch) {
			this._pending.delete(key);
			this._requested.add(key);
		}

		this._send(batch.map(([, resource]) => resource));

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
