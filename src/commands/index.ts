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
import { deleteGraph } from './delete-graph';
import { deletePrefixes } from './delete-prefixes';
import { deleteSparqlConnection } from './delete-sparql-connection';
import { editSparqlConnection } from './edit-sparql-connection';
import { executeDescribeQuery } from './execute-describe-query';
import { executeNotebookCell } from './execute-notebook-cell';
import { executeSparqlQuery } from './execute-sparql-query';
import { executeSparqlQueryFromActiveEditor } from './execute-sparql-query-from-active-editor';
import { executeSparqlQueryFromDocument } from './execute-sparql-query-from-document';
import { findReferences } from './find-references';
import { groupDefinitionsBySource } from './group-definitions-by-source';
import { groupDefinitionsByType } from './group-definitions-by-type';
import { hideIndividualTypes } from './hide-individual-types';
import { hidePropertyTypes } from './hide-property-types';
import { hideReferences } from './hide-references';
import { implementPrefixes } from './implement-prefixes';
import { implementPrefixForIri } from './implement-prefix-for-iri';
import { listGraphs } from './list-graphs';
import { loginMicrosoftAuthProvider } from './login-microsoft-auth-provider';
import { manageSparqlConnections } from './manage-sparql-connections';
import { openDocument } from './open-document';
import { openFileFromLanguage } from './open-file-from-language';
import { openGraph } from './open-graph';
import { openInBrowser } from './open-in-browser';
import { openMentorHomepage } from './open-mentor-homepage';
import { openSettings } from './open-settings';
import { removeFromQueryHistory } from './remove-from-query-history';
import { revealDefinition } from './reveal-definition';
import { revealShapeDefinition } from './reveal-shape-definition';
import { saveSparqlQueryResults } from './save-sparql-query-results';
import { selectActiveLanguage } from './select-active-language';
import { selectSparqlConnection } from './select-sparql-connection';
import { showAnnotatedLabels } from './show-annotated-labels';
import { showIndividualTypes } from './show-individual-types';
import { showPropertyTypes } from './show-property-types';
import { showReferences } from './show-references';
import { showUriLabels } from './show-uri-labels';
import { showUriLabelsWithPrefix } from './show-uri-labels-with-prefix';
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
	deleteGraph,
	deletePrefixes,
	deleteSparqlConnection,
	editSparqlConnection,
	executeDescribeQuery,
	executeNotebookCell,
	executeSparqlQuery,
	executeSparqlQueryFromActiveEditor,
	executeSparqlQueryFromDocument,
	findReferences,
	groupDefinitionsBySource,
	groupDefinitionsByType,
	hideIndividualTypes,
	hidePropertyTypes,
	hideReferences,
	implementPrefixes,
	implementPrefixForIri,
	listGraphs,
	loginMicrosoftAuthProvider,
	manageSparqlConnections,
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
	showAnnotatedLabels,
	showIndividualTypes,
	showPropertyTypes,
	showReferences,
	showUriLabels,
	showUriLabelsWithPrefix,
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