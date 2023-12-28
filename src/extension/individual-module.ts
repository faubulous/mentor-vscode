import { ExtensionContext, commands, window } from "vscode";
import { IndividualNodeProvider } from "./individual-node-provider";

/**
 * Provides the individual explorer and related commands.
 */
export class IndividualModule {
	static activate(context: ExtensionContext): void {
		const individualProvider = new IndividualNodeProvider();
		window.registerTreeDataProvider('mentor.view.individualTree', individualProvider);

		commands.registerCommand('mentor.command.selectIndividual', (uri: string) => individualProvider.select(uri));
		commands.registerCommand('mentor.individualExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.individualExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.individualExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.individualExplorer.command.refreshEntry', () => individualProvider.refresh());
	}
}