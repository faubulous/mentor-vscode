import { FormEditorHostMessage, FormEditorWebviewMessage } from '../form-editor-messages';
import { ResourceOptionData, TermSearchKind } from '../form-editor-model';
import { ITermSearchService } from './term-search-service.interface';

/**
 * Implements the {@link ITermSearchService} over the webview message channel: each request is sent
 * with an identifier of its own, which the host answers it by.
 */
export class TermSearchService implements ITermSearchService {
	private readonly _pending = new Map<number, (answer: ResourceOptionData[] | string[]) => void>();

	private _nextRequestId = 1;

	/**
	 * Create the service over the message channel.
	 * @param _post Posts a message to the extension host.
	 */
	constructor(private readonly _post: (message: FormEditorWebviewMessage) => void) { }

	search(kind: TermSearchKind, text: string, limit: number): Promise<ResourceOptionData[]> {
		return this._request<ResourceOptionData[]>(requestId => ({ id: 'TermSearch', requestId, kind, text, limit }));
	}

	getWorkspaceLanguages(): Promise<string[]> {
		return this._request<string[]>(requestId => ({ id: 'WorkspaceLanguagesRequest', requestId }));
	}

	/**
	 * Take in a message from the host.
	 * @param message The message.
	 * @returns `true` if the message was one this service handles.
	 */
	accept(message: FormEditorHostMessage): boolean {
		switch (message.id) {
			case 'TermSearchResult':
				this._answer(message.requestId, message.options);
				return true;
			case 'WorkspaceLanguagesResponse':
				this._answer(message.requestId, message.languages);
				return true;
			default:
				return false;
		}
	}

	/**
	 * Send a request under an identifier of its own, and wait for the answer to it.
	 * @param messageOf Builds the request for its identifier.
	 * @returns The answer.
	 */
	private _request<T extends ResourceOptionData[] | string[]>(messageOf: (requestId: number) => FormEditorWebviewMessage): Promise<T> {
		const requestId = this._nextRequestId++;

		return new Promise(resolve => {
			this._pending.set(requestId, answer => resolve(answer as T));
			this._post(messageOf(requestId));
		});
	}

	/**
	 * Hand an answer to the request it is for.
	 * @param requestId The request.
	 * @param answer The answer.
	 */
	private _answer(requestId: number, answer: ResourceOptionData[] | string[]): void {
		const resolve = this._pending.get(requestId);

		this._pending.delete(requestId);
		resolve?.(answer);
	}
}
