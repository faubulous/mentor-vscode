import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContext } from './document-context.interface';

/**
 * Make a language the one a document is read in: the labels of its resources, the definition
 * tree and the form editor follow it. The views are told through the `view.activeLanguage`
 * setting.
 * @param context The context of the document.
 * @param language The language tag, or `undefined` for the values without a language.
 */
export function setActiveLanguage(context: IDocumentContext, language: string | undefined): void {
	context.activeLanguageTag = language;

	container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.activeLanguage', language);
}
