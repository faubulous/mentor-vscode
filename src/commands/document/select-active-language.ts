import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { resolveActiveRdfDocument } from '@src/utilities/vscode/active-rdf-document';

/**
 * The language chosen with {@link selectActiveLanguage}: a language tag, `undefined` for the values
 * without a language, or the values of every language.
 */
export type LanguageChoice =
	| { kind: 'language'; language: string | undefined }
	| { kind: 'allLanguages' };

/**
 * Options of {@link selectActiveLanguage}, for a view that can show the values of every language.
 */
export interface SelectActiveLanguageOptions {
	/**
	 * Whether the values of every language are offered, as a view that shows them side by side.
	 */
	offerAllLanguages?: boolean;

	/**
	 * Whether the values of every language are shown now, which the pick then starts on.
	 */
	allLanguagesShown?: boolean;
}

/**
 * An item of the quick pick, with the choice it stands for.
 */
interface LanguageQuickPickItem extends vscode.QuickPickItem {
	/**
	 * The choice, or `undefined` for an item that is no choice.
	 */
	choice?: LanguageChoice;
}

/**
 * The key of the values without a language in the language statistics of a document.
 */
const NO_LANGUAGE_KEY = '__unspecified__';

/**
 * Let the user choose the language the document of the active tab is read in: the labels of its
 * resources, the definition tree and the form editor follow it, and are told through the
 * `view.activeLanguage` setting. A view that can show the values of every language offers that
 * too, which leaves the language of the document as it is.
 */
export const selectActiveLanguage = {
	id: 'mentor.command.selectActiveLanguage',
	handler: async (options: SelectActiveLanguageOptions = {}): Promise<LanguageChoice | undefined> => {
		// The document of the active tab, which may be shown in the form editor.
		const document = await resolveActiveRdfDocument();

		if (!document) {
			return undefined;
		}

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.contexts[document.uri.toString()];

		if (!context) {
			return undefined;
		}

		const choice = await _pickLanguage(context, options);

		if (choice?.kind === 'language') {
			context.activeLanguageTag = choice.language;

			container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.activeLanguage', choice.language);
		}

		return choice;
	}
};

/**
 * Let the user choose a language among those a document writes, with the number of values in each.
 * @param context The context of the document.
 * @param options Whether the values of every language are offered.
 * @returns The choice, or `undefined` when the pick was dismissed.
 */
function _pickLanguage(context: IDocumentContext, options: SelectActiveLanguageOptions = {}): Promise<LanguageChoice | undefined> {
	const quickPick = vscode.window.createQuickPick<LanguageQuickPickItem>();
	const items = _itemsOf(context, options);

	quickPick.title = 'Select active document language';
	quickPick.items = items;
	quickPick.activeItems = items.filter(item => _isCurrent(item.choice, context, options));

	return new Promise(resolve => {
		quickPick.onDidChangeSelection(selection => {
			if (selection.length > 0 && selection[0].choice) {
				resolve(selection[0].choice);

				quickPick.dispose();
			}
		});

		quickPick.onDidHide(() => {
			resolve(undefined);

			quickPick.dispose();
		});

		quickPick.show();
	});
}

/**
 * The items of the quick pick: every language first when offered, then the values without a
 * language, then the languages by their tags.
 * @param context The context of the document.
 * @param options Whether the values of every language are offered.
 * @returns The items.
 */
function _itemsOf(context: IDocumentContext, options: SelectActiveLanguageOptions): LanguageQuickPickItem[] {
	const languageEntries = Array.from(_languageStatsOf(context).entries());

	if (languageEntries.length === 0) {
		return [{ label: 'No language tagged literals found.' }];
	}

	// Note: We translate the language code into a readable name in the UI language of the editor.
	const languageNames = new Intl.DisplayNames([vscode.env.language], { type: 'language' });
	const languageItems = languageEntries.map(([key, count]): LanguageQuickPickItem => {
		const language = key === NO_LANGUAGE_KEY ? undefined : key;
		const values = count === 1 ? 'value' : 'values';
		const displayName = language ? (languageNames.of(language) ?? language) : 'undefined';

		return {
			choice: { kind: 'language', language },
			label: language ? `${language} - ${displayName}` : displayName,
			description: `${count} ${values}`
		};
	}).sort((first, second) => _compareLanguages(_languageOf(first), _languageOf(second)));

	if (options.offerAllLanguages) {
		return [{ choice: { kind: 'allLanguages' }, label: 'All languages', description: 'Show the values of every language' }, ...languageItems];
	}

	return languageItems;
}

/**
 * The number of values in each language of a document, with those without a language under
 * {@link NO_LANGUAGE_KEY}.
 * @param context The context of the document.
 * @returns The number of values by language.
 */
function _languageStatsOf(context: IDocumentContext): Map<string, number> {
	const languageStats = new Map<string, number>();

	for (const [languageTag, count] of Object.entries(context.languageTagStats)) {
		const key = languageTag && languageTag !== 'undefined' ? languageTag : NO_LANGUAGE_KEY;

		languageStats.set(key, (languageStats.get(key) ?? 0) + count);
	}

	return languageStats;
}

/**
 * The language an item chooses.
 * @param item The item.
 * @returns The language tag, or `undefined` for the values without a language.
 */
function _languageOf(item: LanguageQuickPickItem): string | undefined {
	return item.choice?.kind === 'language' ? item.choice.language : undefined;
}

/**
 * Order the values without a language before the languages, and the languages by their tags.
 * @param first The language of the first item.
 * @param second The language of the second item.
 * @returns A negative number when the first comes first, a positive one when the second does.
 */
function _compareLanguages(first: string | undefined, second: string | undefined): number {
	if (first === undefined || second === undefined) {
		return (first === undefined ? 0 : 1) - (second === undefined ? 0 : 1);
	}

	return first.localeCompare(second);
}

/**
 * Indicate whether a choice is the one in effect, which the pick starts on.
 * @param choice The choice.
 * @param context The context of the document.
 * @param options Whether the values of every language are shown.
 * @returns `true` for the choice in effect.
 */
function _isCurrent(choice: LanguageChoice | undefined, context: IDocumentContext, options: SelectActiveLanguageOptions): boolean {
	if (choice?.kind === 'allLanguages') {
		return options.allLanguagesShown === true;
	}

	return choice?.kind === 'language' && !options.allLanguagesShown && choice.language === context.activeLanguageTag;
}
