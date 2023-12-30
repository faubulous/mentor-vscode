import { ExtensionContext, commands, Uri, env, workspace } from "vscode";

/**
 * Provides commands for browsing resources.
 */
export class ResourceModule {
	static activate(context: ExtensionContext): void {
		commands.registerCommand('mentor.command.openInBrowser', (uri: string) => {
			const internalBrowser = workspace.getConfiguration('mentor').get('internalBrowserEnabled');

			if (internalBrowser === true) {
				commands.executeCommand('simpleBrowser.show', uri);
			} else {
				env.openExternal(Uri.parse(uri));
			}
		});
	}
}