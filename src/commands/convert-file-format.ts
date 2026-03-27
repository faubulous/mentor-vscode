import * as vscode from 'vscode';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentFactory, ILanguageInfo } from '@src/services/document/document-factory.interface';

export const convertFileFormat = {
	id: 'mentor.command.convertFileFormat',
	handler: async () => {
		await convertFileFormatHandler();
	}
};

export const convertFileFormatToNTriplesSubmenu = {
	id: 'mentor.command.convertFileFormatToNTriplesSubmenu',
	handler: async () => {
		await convertFileFormatHandler('ntriples');
	}
};

export const convertFileFormatToNQuadsSubmenu = {
	id: 'mentor.command.convertFileFormatToNQuadsSubmenu',
	handler: async () => {
		await convertFileFormatHandler('nquads');
	}
};

export const convertFileFormatToTurtleSubmenu = {
	id: 'mentor.command.convertFileFormatToTurtleSubmenu',
	handler: async () => {
		await convertFileFormatHandler('turtle');
	}
};

export const convertFileFormatToXmlSubmenu = {
	id: 'mentor.command.convertFileFormatToXmlSubmenu',
	handler: async () => {
		await convertFileFormatHandler('xml');
	}
};

async function convertFileFormatHandler(targetLanguageId?: string) {
	const document = vscode.window.activeTextEditor?.document;

	if (!document) {
		vscode.window.showErrorMessage('No document selected.');
		return;
	}

	const diagnostics = vscode.languages.getDiagnostics(document.uri);
	const hasErrors = diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error);

	if (hasErrors) {
		await vscode.window.showErrorMessage('This document has syntax errors and cannot be converted.');
		return;
	}

	const documentIri = document.uri.toString();
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const context = contextService.contexts[documentIri];

	if (!context) {
		vscode.window.showErrorMessage('The document graph could not be retrieved.');
		return;
	}

	const selectedLanguage = targetLanguageId
		? await selectConfiguredTargetLanguage(document.languageId, targetLanguageId)
		: await selectTargetLanguage(document.languageId);

	if (!selectedLanguage) {
		return;
	}

	const sourceGraphIri = context.graphIri.toString();
	const targetGraphIri = await selectTargetGraphIri(sourceGraphIri, selectedLanguage.id);
	const targetLanguage = selectedLanguage.mimetypes[0];

	try {
		const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
		const data = await vocabulary.store.serializeGraph(sourceGraphIri, targetLanguage, targetGraphIri, context.namespaces);
		const result = await vscode.workspace.openTextDocument({ content: data, language: selectedLanguage.id });

		vscode.window.showTextDocument(result);
	} catch (error) {
		vscode.window.showErrorMessage(`Error converting file format: ${error}`);
	}
}

async function selectTargetLanguage(sourceLanguageId: string) {
	const documentFactory = container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);
	const languages = await documentFactory.getSupportedLanguagesInfo();
	const targetLanguageIds = new Set(documentFactory.getConvertibleTargetLanguageIds(sourceLanguageId));

	type LanguagePickItem = vscode.QuickPickItem & {
		language: ILanguageInfo;
	};

	const items: LanguagePickItem[] = languages
		.filter(lang => targetLanguageIds.has(lang.id))
		.map((lang) => ({
			label: lang.name,
			description: (lang.extensions ?? []).join(", "),
			language: lang,
		}));

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select the target format:',
		matchOnDescription: true
	});

	return selected?.language;
}

async function selectConfiguredTargetLanguage(sourceLanguageId: string, targetLanguageId: string) {
	const documentFactory = container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);
	const targetLanguageIds = new Set(documentFactory.getConvertibleTargetLanguageIds(sourceLanguageId));

	if (!targetLanguageIds.has(targetLanguageId)) {
		vscode.window.showErrorMessage('The selected target format is not supported for this document.');
		return undefined;
	}

	return documentFactory.getLanguageInfo(targetLanguageId);
}

/**
 * Select the target graph IRI for the conversion if supported by the target language.
 * @param graphUri The source graph URI.
 * @param targetLanguageId The target language ID.
 * @returns The selected target graph IRI.
 */
async function selectTargetGraphIri(graphUri: string, targetLanguageId: string): Promise<string | undefined> {
	if (targetLanguageId === 'nquads' || targetLanguageId === 'trig') {
		const result = await vscode.window.showInputBox({
			prompt: 'Enter the target graph URI',
			value: graphUri
		});

		return result;
	} else {
		return undefined;
	}
}
