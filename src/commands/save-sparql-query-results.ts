import * as vscode from 'vscode';
import { SparqlQueryExecutionState, BindingsResult } from '@src/services/sparql-query-state';

export const saveSparqlQueryResults = {
    id: 'mentor.command.saveSparqlQueryResults',
    handler: async (context: SparqlQueryExecutionState): Promise<void> => {
        let content = '';

        // TODO: Read the query results from the service instead of serializing them.
        if (context.result?.type === 'bindings') {
            const result = context.result as BindingsResult;

            // Use array join instead of string concatenation
            const lines: string[] = [];

            // Add header row
            lines.push(result.columns.join(', '));

            // Process all data rows at once
            const dataRows = result.rows.map(row =>
                result.columns.map(column => {
                    const term = row[column];

                    if (!term) {
                        return '';
                    }

                    if (term.termType === 'Literal') {
                        const value = term.value || '';

                        // Escape single quotes in the value and wrap in quotes.
                        // Note: This is to have valid CSV and not break lines in the output.
                        const escapedValue = value
                            .replace(/'/g, "''")
                            .replace(/\n/g, '');

                        return `"${escapedValue}"`;
                    } else {
                        return term.value;
                    }
                }).join(', ')
            );

            lines.push(...dataRows);

            // Single join operation at the end
            content = lines.join('\n');
        }

        const document = await vscode.workspace.openTextDocument({ content, language: 'csv' });

        await vscode.window.showTextDocument(document, { preview: false });
    }
};