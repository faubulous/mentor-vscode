import { ExtensionContext, commands, window } from "vscode";
import { SettingsPanel } from "./panels/SettingsPanel";
import { SettingsViewProvider } from "./panels/SettingsViewProvider";

export class SettingsModule {
	static activate(context: ExtensionContext) {
		// Open the settings view via command
		const command = () => { SettingsPanel.render(context.extensionUri); }
		const showGalleryCommand = commands.registerCommand("mentor.command.openSettings", command);

		context.subscriptions.push(showGalleryCommand);

		// Open the settings view as a webview; will use this for the tree view once React components are implemented.
		const settingsViewProvider = new SettingsViewProvider(context.extensionUri);
		const settingsDisposable = window.registerWebviewViewProvider(SettingsViewProvider.viewType, settingsViewProvider)

		context.subscriptions.push(settingsDisposable);
	}
}