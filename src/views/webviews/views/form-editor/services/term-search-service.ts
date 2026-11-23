import { FormEditorMessages, FormEditorWebviewMessage } from '../form-editor-messages';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { PredicateRangeData, ResourceOptionData, TermSearchStatement, TermSearchTargetType } from '../form-editor-model';
import { ITermSearchService } from './term-search-service.interface';

/**
 * Implements the {@link ITermSearchService} over the webview message channel: each request is sent
 * with an identifier of its own, which the host answers it by.
 */
export class TermSearchService implements ITermSearchService {
	private readonly _pending = new Map<number, (answer: unknown) => void>();

	private _nextRequestId = 1;

	/**
	 * Create the service over the message channel.
	 * @param _post Posts a message to the extension host.
	 */
	constructor(private readonly _post: (message: FormEditorWebviewMessage) => void) { }

	search(targetType: TermSearchTargetType, text: string, limit: number, statement?: TermSearchStatement): Promise<ResourceOptionData[]> {
		return this._request<ResourceOptionData[]>(requestId => ({ id: 'TermSearch', requestId, targetType, text, limit, statement }));
	}

	getWorkspaceLanguages(): Promise<string[]> {
		return this._request<string[]>(requestId => ({ id: 'WorkspaceLanguagesRequest', requestId }));
	}

	getPredicateRange(subject: NamedNode | BlankNode, predicate: string): Promise<PredicateRangeData | undefined> {
		return this._request<PredicateRangeData | undefined>(requestId => ({ id: 'PredicateRangeRequest', requestId, subject, predicate }));
	}

	/**
	 * Take in a message from the host.
	 * @param message The message.
	 * @returns `true` if the message was one this service handles.
	 */
	accept(message: FormEditorMessages): boolean {
		switch (message.id) {
			case 'TermSearchResult':
				this._answer(message.requestId, message.options);
				return true;
			case 'WorkspaceLanguagesResponse':
				this._answer(message.requestId, message.languages);
				return true;
			case 'PredicateRangeResponse':
				this._answer(message.requestId, message.range);
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
	private _request<T>(messageOf: (requestId: number) => FormEditorWebviewMessage): Promise<T> {
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
	private _answer(requestId: number, answer: unknown): void {
		const resolve = this._pending.get(requestId);

		this._pending.delete(requestId);
		resolve?.(answer);
	}
}
