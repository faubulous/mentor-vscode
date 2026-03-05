import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { PrefixDownloaderService } from '@src/services/shared/prefix-downloader-service';
import { GlobalStorageService } from '@src/services/shared/local-storage-service';
import { ServiceToken } from '@src/services/service-token';

export const updatePrefixes = {
	id: 'mentor.command.updatePrefixes',
	handler: async () => {
		const prefixDownloader = container.resolve<PrefixDownloaderService>(ServiceToken.PrefixDownloaderService);
		const globalStorage = container.resolve<GlobalStorageService>(ServiceToken.GlobalStorageService);

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