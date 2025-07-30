import * as vscode from 'vscode';
import { SparqlQueryContext, BindingsResult } from '@/services';

export async function saveSparqlQueryResults(context: SparqlQueryContext): Promise<void> {
    let content = '';

    if (context.resultType === 'bindings') {
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