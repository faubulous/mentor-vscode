import * as vscode from 'vscode';
import { alphabeticalStrategy } from '@faubulous/mentor-rdf-serializers';
import { sortDocument } from './sort-document';

export const sortDocumentAlphabetically = {
	id: 'mentor.command.sortDocumentAlphabetically',
	handler: async (documentUri?: vscode.Uri) => {
		await sortDocument(documentUri, alphabeticalStrategy);
	}
};
