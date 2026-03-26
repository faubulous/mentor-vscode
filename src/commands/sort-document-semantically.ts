import * as vscode from 'vscode';
import { createSemanticStrategy } from '@faubulous/mentor-rdf-serializers';
import { sortDocument } from './sort-document';

export const sortDocumentSemantically = {
	id: 'mentor.command.sortDocumentSemantically',
	handler: async (documentUri?: vscode.Uri) => {
		await sortDocument(documentUri, createSemanticStrategy());
	}
};
