import { ExtensionContext, commands, env, Uri } from "vscode";

/**
 * Provides commands for browsing resources.
 */
export class ResourceModule {
	static activate(context: ExtensionContext): void {
		commands.registerCommand('mentor.command.browseResource', (uri: string) => commands.executeCommand('open', Uri.parse(uri)));
		commands.registerCommand('mentor.command.openExternal', (uri: string) => env.openExternal(Uri.parse(uri)));
		commands.registerCommand('mentor.command.setNamespaceColor', (uri: string) => {
			commands.executeCommand('editor.action.showOrFocusStandaloneColorPicker').then((value) => {
				console.debug(value);
			});
		});
	}
}