import { FormEditorHostMessage, FormEditorWebviewMessage } from '../form-editor-messages';
import { ResourceOptionData, TermSearchKind } from '../form-editor-model';
import { ITermSearchService } from './term-search-service.interface';

/**
 * Implements the {@link ITermSearchService} over the webview message channel: each search is sent
 * with an identifier of its own, which the host answers it by.
 */
export class TermSearchService implements ITermSearchService {
	private readonly _pending = new Map<number, (options: ResourceOptionData[]) => void>();

	private _nextRequestId = 1;

	/**
	 * Create the service over the message channel.
	 * @param _post Posts a message to the extension host.
	 */
	constructor(private readonly _post: (message: FormEditorWebviewMessage) => void) { }

	search(kind: TermSearchKind, text: string, limit: number): Promise<ResourceOptionData[]> {
		const requestId = this._nextRequestId++;

		return new Promise(resolve => {
			this._pending.set(requestId, resolve);
			this._post({ id: 'TermSearch', requestId, kind, text, limit });
		});
	}

	/**
	 * Take in a message from the host.
	 * @param message The message.
	 * @returns `true` if the message was one this service handles.
	 */
	accept(message: FormEditorHostMessage): boolean {
		if (message.id !== 'TermSearchResult') {
			return false;
		}

		const resolve = this._pending.get(message.requestId);

		this._pending.delete(message.requestId);
		resolve?.(message.options);

		return true;
	}
}
