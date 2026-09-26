import * as vscode from 'vscode';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { BindingsFormat, formatQueryResult } from '@src/languages/sparql/services/bindings-formatter';
import { getResultsCopyFormat, getResultsIriFormat } from '@src/languages/sparql/services/query-results-format';

export const copySparqlQueryResults = {
    id: 'mentor.command.copySparqlQueryResults',
    handler: async (context: SparqlQueryExecutionState | undefined, format?: BindingsFormat): Promise<void> => {
        const result = context?.result;

        if (result?.type !== 'bindings' && result?.type !== 'boolean') {
            return;
        }

        const content = formatQueryResult(result, {
            format: format ?? getResultsCopyFormat(),
            iriForm: getResultsIriFormat()
        });

        await vscode.env.clipboard.writeText(content);

        const rowCount = result.type === 'bindings' ? result.rows.length : 1;

        vscode.window.setStatusBarMessage(`Copied ${rowCount} row(s) to the clipboard.`, 3000);
    }
};
