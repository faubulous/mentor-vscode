import * as vscode from 'vscode';
import { SparqlQueryExecutionState, BindingsResult } from '@/services/sparql-query-state';

export async function saveSparqlQueryResults(context: SparqlQueryExecutionState): Promise<void> {
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
            result.columns.map(column => row[column]?.value || '').join(', ')
        );

        lines.push(...dataRows);

        // Single join operation at the end
        content = lines.join('\n');
    }

    const document = await vscode.workspace.openTextDocument({ content, language: 'csv' });

    await vscode.window.showTextDocument(document, { preview: false });
}