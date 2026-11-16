import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceDetail, ResourceSummary } from '../form-editor-model';
import { IResourceDataService } from './resource-data-service.interface';

/**
 * The maximum number of resources asked for in one message.
 */
const MAX_BATCH_SIZE = 100;

/**
 * An entry of the cache of the service: what the host delivered for one resource, kept by the key
 * of its term until a new snapshot makes it stale.
 */
interface LoadedResource {
	/**
	 * The properties of the resource, which its card shows.
	 */
	detail: ResourceDetail;

	/**
	 * The summary the host sends along for a resource the snapshot does not list, such as one read
	 * from the store; absent for a resource of the document, whose summary is in the snapshot.
	 */
	summary?: ResourceSummary;
}

/**
 * Serves resource detail over the webview message channel. Requests are coalesced into one
 * message per frame so that scrolling does not produce a message per row. The detail is cached by
 * the `termToString` key of the resource, with the summary that came with it, and is kept as stale
 * when a new snapshot arrives until the detail of that snapshot is loaded. A resource the host
 * could not resolve is not asked for again until the next snapshot.
 */
export class ResourceDataService implements IResourceDataService {
	private readonly _loaded = new Map<string, LoadedResource>();

	private readonly _stale = new Map<string, LoadedResource>();

	private readonly _missing = new Set<string>();

	private readonly _listeners = new Set<() => void>();

	private readonly _pending = new Map<string, NamedNode | BlankNode>();

	private readonly _requested = new Set<string>();

	private _version = -1;

	private _revision = -1;

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
		return this._loaded.get(termToString(resource))?.detail;
	}

	getStale(resource: NamedNode | BlankNode): ResourceDetail | undefined {
		return this._stale.get(termToString(resource))?.detail;
	}

	getSummary(resource: NamedNode | BlankNode): ResourceSummary | undefined {
		const key = termToString(resource);

		return this._loaded.get(key)?.summary ?? this._stale.get(key)?.summary;
	}

	request(resources: (NamedNode | BlankNode)[]): void {
		let added = false;

		for (const resource of resources) {
			const key = termToString(resource);

			if (!this._loaded.has(key) && !this._missing.has(key) && !this._requested.has(key) && !this._pending.has(key)) {
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
	 * Accept the detail delivered for a snapshot, ignoring anything that belongs to a snapshot that
	 * has since been superseded.
	 * @param revision The revision of the snapshot the detail was built for.
	 * @param resources The delivered detail.
	 * @param missing Resources the host could not resolve.
	 * @param summaries The summaries that came with the detail, for resources the snapshot does not
	 * list.
	 */
	accept(revision: number, resources: ResourceDetail[], missing: (NamedNode | BlankNode)[] = [], summaries: ResourceSummary[] = []): void {
		if (revision !== this._revision) {
			return;
		}

		const summaryByKey = new Map(summaries.map(summary => [termToString(summary.term), summary]));

		for (const detail of resources) {
			const key = termToString(detail.term);

			this._loaded.set(key, { detail, summary: summaryByKey.get(key) });
			this._stale.delete(key);
			this._requested.delete(key);
		}

		for (const resource of missing) {
			const key = termToString(resource);

			this._requested.delete(key);
			this._missing.add(key);
		}

		if (resources.length > 0) {
			this._notify();
		}
	}

	/**
	 * Move to a new snapshot: a new document version, or the same version built again because its
	 * labels, the settings or the language changed. What was loaded for the previous snapshot is
	 * kept as stale detail until the new detail arrives, so the rows of an open card do not vanish
	 * during the reload that follows every edit.
	 * @param version The document version of the snapshot.
	 * @param revision The revision of the snapshot.
	 */
	setSnapshot(version: number, revision: number): void {
		if (revision === this._revision) {
			return;
		}

		this._version = version;
		this._revision = revision;

		for (const [key, loaded] of this._loaded) {
			this._stale.set(key, loaded);
		}

		this._loaded.clear();
		this._missing.clear();
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
