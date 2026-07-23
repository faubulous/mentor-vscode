import * as vscode from 'vscode';
import { SemanticSortingStrategy } from '@faubulous/mentor-rdf-serializers';
import { sortDocument } from './sort-document';

export const sortDocumentSemantically = {
	id: 'mentor.command.sortDocumentSemantically',
	handler: async (documentUri?: vscode.Uri) => {
		await sortDocument(documentUri, new SemanticSortingStrategy());
	}
};

export const sortDocumentSemanticallySubmenu = {
	id: 'mentor.command.sortDocumentSemanticallySubmenu',
	handler: sortDocumentSemantically.handler
};
