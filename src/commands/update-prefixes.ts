import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/service-token';
import { IPrefixDownloaderService, ILocalStorageService } from '@src/services/interface';

export const updatePrefixes = {
	id: 'mentor.command.updatePrefixes',
	handler: async () => {
		const prefixDownloader = container.resolve<IPrefixDownloaderService>(ServiceToken.PrefixDownloaderService);
		const globalStorage = container.resolve<ILocalStorageService>(ServiceToken.GlobalStorageService);

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: `Downloading prefixes from ${prefixDownloader.endpointUrl}...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			try {
				let result = await prefixDownloader.fetchPrefixes();

				globalStorage.setValue('defaultPrefixes', result);

				progress.report({ increment: 100 });
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to download prefixes: ${error.message}`);
			}
		});
	}
}