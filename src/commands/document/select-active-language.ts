import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { setActiveLanguage } from '@src/services/document/active-language';
import { pickLanguage } from '@src/services/document/language-quick-pick';
import { resolveActiveRdfDocument } from '@src/utilities/vscode/active-rdf-document';

export const selectActiveLanguage = {
	id: 'mentor.command.selectActiveLanguage',
	handler: async () => {
		// The document of the active tab, which may be shown in the form editor.
		const document = await resolveActiveRdfDocument();

		if (!document) {
			return;
		}

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.contexts[document.uri.toString()];

		if (!context) {
			return;
		}

		const choice = await pickLanguage(context);

		if (choice?.kind === 'language') {
			setActiveLanguage(context, choice.language);
		}
	}
};
