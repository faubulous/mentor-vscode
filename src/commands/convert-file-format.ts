import * as vscode from 'vscode';
import { DataFactory, NamedNode } from 'n3';
import { mentor } from '@src/mentor';
import { LanguageInfo } from '@src/workspace/document-factory';

export const convertFileFormat = {
	id: 'mentor.command.convertFileFormat',
	handler: async () => {
		const document = vscode.window.activeTextEditor?.document;

		if (!document) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}

		const documentIri = document.uri.toString();
		const context = mentor.contexts[documentIri];

		if (!context) {
			vscode.window.showErrorMessage('The document graph could not be retrieved.');
			return;
		}

		const selectedLanguage = await selectTargetLanguage(document.languageId);

		if (!selectedLanguage) {
			// The user cancelled the action.
			return;
		}

		const graph = context.graphIri.toString();
		const prefixes: { [key: string]: NamedNode } = {};

		for (const [prefix, uri] of Object.entries(context.namespaces)) {
			prefixes[prefix] = DataFactory.namedNode(uri);
		}

		const data = await mentor.vocabulary.store.serializeGraph(graph, prefixes, selectedLanguage.mimetypes[0]);
		const result = await vscode.workspace.openTextDocument({ content: data, language: selectedLanguage.id });

		vscode.window.showTextDocument(result);
	}
};

async function selectTargetLanguage(sourceLanguageId: string) {
	const languages = await mentor.documentFactory.getSupportedLanguagesInfo();

	type LanguagePickItem = vscode.QuickPickItem & {
		language: LanguageInfo;
	};

	// TODO: Move isSerializableGraph into mentor-rdf.Store and add support for RDF/XML serialization
	const items: LanguagePickItem[] = languages
		.filter(lang => lang.id !== sourceLanguageId && lang.id !== 'xml')
		.filter(lang => mentor.documentFactory.isConvertibleLanguage(lang.id))
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