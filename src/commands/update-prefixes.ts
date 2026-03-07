import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IPrefixDownloaderService } from '@src/services/document';

export const updatePrefixes = {
	id: 'mentor.command.updatePrefixes',
	handler: async () => {
		const prefixDownloader = container.resolve<IPrefixDownloaderService>(ServiceToken.PrefixDownloaderService);

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: `Downloading prefixes from ${prefixDownloader.endpointUrl}...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			try {
				const result = await prefixDownloader.fetchPrefixes();

				const extensionContext = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
				extensionContext.globalState.update('defaultPrefixes', result);

				progress.report({ increment: 100 });
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to download prefixes: ${error.message}`);
			}
		});
	}
}