import * as vscode from 'vscode';
import { container, PrefixDownloaderService, GlobalStorageService } from '@src/container';

export const updatePrefixes = {
	id: 'mentor.command.updatePrefixes',
	handler: async () => {
		const prefixDownloader = container.resolve(PrefixDownloaderService);
		const globalStorage = container.resolve(GlobalStorageService);

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