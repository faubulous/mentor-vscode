import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const updatePrefixes = {
	commandId: 'mentor.command.updatePrefixes',
	handler: async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: `Downloading prefixes from ${mentor.prefixDownloaderService.endpointUrl}...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			try {
				let result = await mentor.prefixDownloaderService.fetchPrefixes();

				mentor.globalStorage.setValue('defaultPrefixes', result);

				progress.report({ increment: 100 });
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to download prefixes: ${error.message}`);
			}
		});
	}
}