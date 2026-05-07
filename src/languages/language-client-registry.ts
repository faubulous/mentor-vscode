import { ILanguageClient } from './language-client-factory';

export interface ILanguageClientRegistry {
	register(languageId: string, client: ILanguageClient): void;
	unregister(languageId: string): void;
	requestContextRefresh(languageId: string, uri: string): Promise<boolean>;
}

export class LanguageClientRegistry implements ILanguageClientRegistry {
	private static readonly _refreshContextRequest = 'mentor.request.refreshDocument';

	private readonly _clientsByLanguageId = new Map<string, ILanguageClient>();

	register(languageId: string, client: ILanguageClient): void {
		this._clientsByLanguageId.set(languageId, client);
	}

	unregister(languageId: string): void {
		this._clientsByLanguageId.delete(languageId);
	}

	async requestContextRefresh(languageId: string, uri: string): Promise<boolean> {
		const languageClient = this._clientsByLanguageId.get(languageId);

		if (!languageClient?.sendRequest) {
			return false;
		}

		try {
			const result = await languageClient.sendRequest<boolean>(
				LanguageClientRegistry._refreshContextRequest,
				{ uri }
			);

			return result !== false;
		} catch {
			return false;
		}
	}
}