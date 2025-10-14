import * as vscode from 'vscode';
import { mentor } from '../mentor';

interface LanguageQuckPickItem extends vscode.QuickPickItem {
	/**
	 * The language code.
	 */
	language: string | undefined;
}

export const selectActiveLanguage = {
	id: 'mentor.command.selectActiveLanguage',
	handler: async () => {
		const document = vscode.window.activeTextEditor?.document;

		if (!document) {
			return;
		}

		const context = mentor.contexts[document.uri.toString()];

		if (!context) {
			return;
		}

		const quickPick = vscode.window.createQuickPick<LanguageQuckPickItem>();
		quickPick.title = 'Select active document language';

		if (!context.primaryLanguage) {
			quickPick.items = [{
				label: 'No language tagged literals found.',
				language: undefined
			}];
		} else {
			const languageStats = mentor.vocabulary.getLanguageTagUsageStats(context.graphs);

			// Note: We translate the language code into a readable name in the UI language of the editor.
			const languageNames = new Intl.DisplayNames([vscode.env.language], { type: 'language' });

			quickPick.items = Object.entries(languageStats).map(([l, count]) => {
				const values = count === 1 ? 'value' : 'values';

				return {
					language: l,
					label: `${l} - ${languageNames.of(l.toUpperCase())}`,
					description: `${count} ${values}`,
				};
			}).sort((a, b) => a.language.localeCompare(b.language));

			quickPick.onDidChangeSelection((selection) => {
				if (selection.length > 0) {
					const language = selection[0].language;
					context.activeLanguageTag = language;

					// Refresh the tree views..
					mentor.settings.set('view.activeLanguage', language);

					quickPick.dispose();
				}
			});
		}

		quickPick.show();
	}
};