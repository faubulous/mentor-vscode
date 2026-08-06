import * as vscode from 'vscode';
import { AlphabeticalSortingStrategy } from '@faubulous/mentor-rdf-serializers';
import { sortDocument } from './sort-document';

export const sortDocumentAlphabetically = {
	id: 'mentor.command.sortDocumentAlphabetically',
	handler: async (documentUri?: vscode.Uri) => {
		await sortDocument(documentUri, new AlphabeticalSortingStrategy());
	}
};

export const sortDocumentAlphabeticallySubmenu = {
	id: 'mentor.command.sortDocumentAlphabeticallySubmenu',
	handler: sortDocumentAlphabetically.handler
};
