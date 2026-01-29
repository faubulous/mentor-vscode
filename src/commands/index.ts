import * as vscode from 'vscode';

import { analyzeWorkspace } from './analyze-workspace';
import { cancelSparqlQueryExecution } from './cancel-sparql-query-execution';
import { clearQueryHistory } from './clear-query-history';
import { convertFileFormat } from './convert-file-format';
import { createDocument } from './create-document';
import { createDocumentFromLanguage } from './create-document-from-language';
import { createNotebook } from './create-notebook';
import { createNotebookFromEditor } from './create-notebook-from-editor';
import { createSparqlConnection } from './create-sparql-connection';
import { deletePrefixes } from './delete-prefixes';
import { deleteSparqlConnection } from './delete-sparql-connection';
import { editSparqlConnection } from './edit-sparql-connection';
import { executeDescribeQuery } from './execute-describe-query';
import { executeNotebookCell } from './execute-notebook-cell';
import { executeSparqlQuery } from './execute-sparql-query';
import { executeSparqlQueryFromActiveEditor } from './execute-sparql-query-from-active-editor';
import { executeSparqlQueryFromDocument } from './execute-sparql-query-from-document';
import { findReferences } from './find-references';
import { implementPrefixes } from './implement-prefixes';
import { implementPrefixForIri } from './implement-prefix-for-iri';
import { listGraphs } from './list-graphs';
import { loginMicrosoftAuthProvider } from './login-microsoft-auth-provider';
import { openConnectionsList } from './open-connections-list';
import { openDocument } from './open-document';
import { openFileFromLanguage } from './open-file-from-language';
import { openGraph } from './open-graph';
import { openMentorHomepage } from './open-mentor-homepage';
import { openInBrowser } from './open-in-browser';
import { openSettings } from './open-settings';
import { removeFromQueryHistory } from './remove-from-query-history';
import { revealDefinition } from './reveal-definition';
import { revealShapeDefinition } from './reveal-shape-definition';
import { saveSparqlQueryResults } from './save-sparql-query-results';
import { selectActiveLanguage } from './select-active-language';
import { selectSparqlConnection } from './select-sparql-connection';
import { showWebview } from './show-webview';
import { sortPrefixes } from './sort-prefixes';
import { updatePrefixes } from './update-prefixes';

const commands = [
	analyzeWorkspace,
	cancelSparqlQueryExecution,
	clearQueryHistory,
	convertFileFormat,
	createDocument,
	createDocumentFromLanguage,
	createNotebook,
	createNotebookFromEditor,
	createSparqlConnection,
	deletePrefixes,
	deleteSparqlConnection,
	editSparqlConnection,
	executeDescribeQuery,
	executeNotebookCell,
	executeSparqlQuery,
	executeSparqlQueryFromActiveEditor,
	executeSparqlQueryFromDocument,
	findReferences,
	implementPrefixes,
	implementPrefixForIri,
	listGraphs,
	loginMicrosoftAuthProvider,
	openConnectionsList,
	openDocument,
	openFileFromLanguage,
	openGraph,
	openMentorHomepage,
	openInBrowser,
	openSettings,
	removeFromQueryHistory,
	revealDefinition,
	revealShapeDefinition,
	saveSparqlQueryResults,
	selectActiveLanguage,
	selectSparqlConnection,
	showWebview,
	sortPrefixes,
	updatePrefixes,
];

export const commandRegistry = {
	registerAll: (): vscode.Disposable[] => {
		return commands.map(command => {
			return vscode.commands.registerCommand(command.id, command.handler);
		});
	}
}