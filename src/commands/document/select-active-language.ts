import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';

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

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.contexts[document.uri.toString()];

		if (!context) {
			return;
		}

		const quickPick = vscode.window.createQuickPick<LanguageQuckPickItem>();
		quickPick.title = 'Select active document language';

		const noLanguageKey = '__unspecified__';
		const languageStats = new Map<string, number>();

		for (const predicateStats of Object.values(context.predicateStats)) {
			for (const [languageTag, count] of Object.entries(predicateStats.languageTags)) {
				const key = languageTag && languageTag !== 'undefined' ? languageTag : noLanguageKey;

				languageStats.set(key, (languageStats.get(key) ?? 0) + count);
			}
		}

		const languageEntries = Array.from(languageStats.entries());

		if (languageEntries.length === 0) {
			quickPick.items = [{
				label: 'No language tagged literals found.',
				language: undefined
			}];
		} else {
			// Note: We translate the language code into a readable name in the UI language of the editor.
			const languageNames = new Intl.DisplayNames([vscode.env.language], { type: 'language' });

			quickPick.items = languageEntries.map(([l, count]) => {
				const language = l === noLanguageKey ? undefined : l;
				const values = count === 1 ? 'value' : 'values';
				const displayName = language ? (languageNames.of(language) ?? language) : 'undefined';

				return {
					language,
					label: language ? `${language} - ${displayName}` : displayName,
					description: `${count} ${values}`,
				};
			}).sort((a, b) => {
				if (!a.language && b.language) {
					return -1;
				}

				if (a.language && !b.language) {
					return 1;
				}

				if (!a.language && !b.language) {
					return 0;
				}

				return a.language!.localeCompare(b.language!);
			});

			quickPick.onDidChangeSelection((selection) => {
				if (selection.length > 0) {
					const language = selection[0].language;
					context.activeLanguageTag = language;

					// Refresh the tree views..
					const settings = container.resolve<ISettingsService>(ServiceToken.SettingsService);
					settings.set('view.activeLanguage', language);

					quickPick.dispose();
				}
			});
		}

		quickPick.show();
	}
};