import * as vscode from 'vscode';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { BindingsFormat, formatQueryResult, getLanguageIdForFormat } from '@src/languages/sparql/services/bindings-formatter';
import { getResultsIriFormat } from '@src/languages/sparql/services/query-results-format';

export const saveSparqlQueryResults = {
    id: 'mentor.command.saveSparqlQueryResults',
    handler: async (context: SparqlQueryExecutionState | undefined, format: BindingsFormat = 'csv'): Promise<void> => {
        const result = context?.result;

        if (result?.type !== 'bindings' && result?.type !== 'boolean') {
            return;
        }

        const content = formatQueryResult(result, { format, iriForm: getResultsIriFormat() });

        const document = await vscode.workspace.openTextDocument({
            content,
            language: getLanguageIdForFormat(format)
        });

        await vscode.window.showTextDocument(document, { preview: false });
    }
};
