import * as vscode from 'vscode';
import { createByTypeStrategy } from '@faubulous/mentor-rdf-serializers';
import { sortDocument } from './sort-document';

export const sortDocumentByType = {
	id: 'mentor.command.sortDocumentByType',
	handler: async (documentUri?: vscode.Uri) => {
		await sortDocument(documentUri, createByTypeStrategy());
	}
};
