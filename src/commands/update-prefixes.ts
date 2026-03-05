import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { PrefixDownloaderService, GlobalStorageService } from '@src/services';
import { InjectionToken } from '@src/injection-token';

export const updatePrefixes = {
	id: 'mentor.command.updatePrefixes',
	handler: async () => {
		const prefixDownloader = container.resolve<PrefixDownloaderService>(InjectionToken.PrefixDownloaderService);
		const globalStorage = container.resolve<GlobalStorageService>(InjectionToken.GlobalStorageService);

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