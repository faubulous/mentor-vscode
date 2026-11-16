import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceCardBodyData, ResourceCardHeaderData } from '../form-editor-model';
import { IResourceDataService } from './resource-data-service.interface';

/**
 * The maximum number of resources asked for in one message.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Serves the statements about resources over the webview message channel. Requests are coalesced
 * into one message per frame so that scrolling does not produce a message per row. The statements
 * are cached by the `termToString` key of their subject and kept as stale when a new snapshot
 * arrives, until those of the new snapshot are loaded. The card headers the host sends along, for
 * resources the snapshot does not list, are kept until newer ones arrive. A resource the host could
 * not resolve is not asked for again until the next snapshot.
 */
export class ResourceDataService implements IResourceDataService {
	private readonly _statements = new Map<string, ResourceCardBodyData>();

	private readonly _staleStatements = new Map<string, ResourceCardBodyData>();

	private readonly _cardHeaders = new Map<string, ResourceCardHeaderData>();

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
	 * The document version the loaded statements belong to.
	 * @returns The version.
	 */
	get version(): number {
		return this._version;
	}

	getCardBody(resource: NamedNode | BlankNode): ResourceCardBodyData | undefined {
		return this._statements.get(termToString(resource));
	}

	getStaleCardBody(resource: NamedNode | BlankNode): ResourceCardBodyData | undefined {
		return this._staleStatements.get(termToString(resource));
	}

	getCardHeader(resource: NamedNode | BlankNode): ResourceCardHeaderData | undefined {
		return this._cardHeaders.get(termToString(resource));
	}

	request(resources: (NamedNode | BlankNode)[]): void {
		let added = false;

		for (const resource of resources) {
			const key = termToString(resource);

			if (!this._statements.has(key) && !this._missing.has(key) && !this._requested.has(key) && !this._pending.has(key)) {
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
	 * Accept what the host delivered for a snapshot, ignoring anything that belongs to a snapshot
	 * that has since been superseded.
	 * @param revision The revision of the snapshot the statements were built for.
	 * @param cardBodies The statements about the requested resources.
	 * @param missing Resources the host could not resolve.
	 * @param cardHeaders The card headers of the resources the snapshot does not list.
	 */
	accept(revision: number, cardBodies: ResourceCardBodyData[], missing: (NamedNode | BlankNode)[] = [], cardHeaders: ResourceCardHeaderData[] = []): void {
		if (revision !== this._revision) {
			return;
		}

		for (const cardHeader of cardHeaders) {
			this._cardHeaders.set(termToString(cardHeader.subject), cardHeader);
		}

		for (const resource of cardBodies) {
			const key = termToString(resource.subject);

			this._statements.set(key, resource);
			this._staleStatements.delete(key);
			this._requested.delete(key);
		}

		for (const resource of missing) {
			const key = termToString(resource);

			this._requested.delete(key);
			this._missing.add(key);
		}

		if (cardBodies.length > 0) {
			this._notify();
		}
	}

	/**
	 * Move to a new snapshot: a new document version, or the same version built again because its
	 * labels, the settings or the language changed. The statements loaded for the previous snapshot
	 * are kept as stale until those of the new one arrive, so the rows of an open card do not vanish
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

		for (const [key, cardBody] of this._statements) {
			this._staleStatements.set(key, cardBody);
		}

		this._statements.clear();
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
